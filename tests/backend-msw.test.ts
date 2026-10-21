import {
  beforeAll,
  afterAll,
  afterEach,
  beforeEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { z } from "zod";
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("OPENAI_API_KEY", "test-not-a-real-key");
  vi.stubEnv("OPENAI_MAX_RETRIES", "0");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  vi.stubEnv("DAILY_TOKEN_BUDGET", "2000000");
});
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});
const completion = (content: string) =>
  HttpResponse.json({
    id: "completion-test",
    object: "chat.completion",
    created: 1,
    model: "gpt-4o-mini",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
  });
it("reserves repair tokens before a second provider call can exceed the daily budget", async () => {
  vi.stubEnv("DAILY_TOKEN_BUDGET", "1500");
  let calls = 0;
  server.use(
    http.post("https://api.openai.com/v1/chat/completions", () => {
      calls++;
      return completion(calls === 1 ? "invalid JSON" : '{"count":2}');
    }),
  );
  const { callStructured } = await import("@/lib/llm/client");
  await expect(
    callStructured({
      schema: z.object({ count: z.number() }),
      name: "limited_repair",
      messages: [],
      maxTokens: 1000,
    }),
  ).rejects.toThrow("AI unavailable");
  expect(calls).toBe(1);
});
describe("MSW provider transport", () => {
  it("sends strict structured format and validates provider response", async () => {
    let received: Record<string, unknown> | undefined;
    server.use(
      http.post(
        "https://api.openai.com/v1/chat/completions",
        async ({ request }) => {
          received = (await request.json()) as Record<string, unknown>;
          return completion('{"count":4}');
        },
      ),
    );
    const { callStructured } = await import("@/lib/llm/client");
    const result = await callStructured({
      schema: z.object({ count: z.number() }),
      name: "counter",
      messages: [{ role: "user", content: "count" }],
    });
    expect(result.data).toEqual({ count: 4 });
    expect(result.tokens).toEqual({ in: 20, out: 10 });
    expect(result).toHaveProperty("validation", {
      firstAttemptValid: true,
      repairAttempted: false,
      repairValid: null,
    });
    expect(received?.response_format).toMatchObject({
      type: "json_schema",
      json_schema: { strict: true, name: "counter" },
    });
  });
  it("repairs one malformed structured response through a real SDK HTTP call", async () => {
    let calls = 0;
    server.use(
      http.post("https://api.openai.com/v1/chat/completions", () =>
        completion(++calls === 1 ? '{"count":"wrong"}' : '{"count":2}'),
      ),
    );
    const { callStructured } = await import("@/lib/llm/client");
    expect(
      (
        await callStructured({
          schema: z.object({ count: z.number() }),
          name: "repair_transport",
          messages: [],
        })
      ).repaired,
    ).toBe(true);
    expect(calls).toBe(2);
  });
  it("falls back to valid domain plan after two malformed HTTP responses", async () => {
    let calls = 0;
    server.use(
      http.post("https://api.openai.com/v1/moderations", () =>
        HttpResponse.json({
          id: "mod",
          model: "omni-moderation-latest",
          results: [{ flagged: false }],
        }),
      ),
      http.post("https://api.openai.com/v1/chat/completions", () => {
        calls++;
        return completion("invalid JSON");
      }),
    );
    const { generatePlan } = await import("@/lib/llm/generatePlan");
    const { exampleInput } = await import("@/lib/domain/planner");
    const { PlanSchema } = await import("@/lib/schemas");
    const plan = await generatePlan(exampleInput(), { promptVersion: "v1" });
    expect(PlanSchema.safeParse(plan).success).toBe(true);
    expect(plan.meta.source).toBe("fallback");
    expect(plan.meta.promptVersion).toBe("2026-10-v1");
    expect(plan.meta).toHaveProperty("structuredValidation", {
      firstAttemptValid: false,
      repairAttempted: true,
      repairValid: false,
    });
    expect(calls).toBe(2);
  });
  it("fails closed when provider moderation flags unsafe input", async () => {
    server.use(
      http.post("https://api.openai.com/v1/moderations", () =>
        HttpResponse.json({ results: [{ flagged: true }] }),
      ),
    );
    const { moderate } = await import("@/lib/llm/client");
    expect(await moderate("unsafe text")).toBe(false);
  });
  it("returns deterministic fallback for an HTTP provider outage", async () => {
    server.use(
      http.post("https://api.openai.com/v1/moderations", () =>
        HttpResponse.json({ results: [{ flagged: false }] }),
      ),
      http.post(
        "https://api.openai.com/v1/chat/completions",
        () => new HttpResponse(null, { status: 503 }),
      ),
    );
    const { generatePlan } = await import("@/lib/llm/generatePlan");
    const { exampleInput } = await import("@/lib/domain/planner");
    expect((await generatePlan(exampleInput())).meta.source).toBe("fallback");
  });
});
describe("cache, circuit and cancellation", () => {
  it("roundtrips cached values without exposing a mutable reference", async () => {
    const { cacheGet, cacheSet } = await import("@/lib/llm/cache");
    await cacheSet("test", { value: 3 });
    const first = await cacheGet<{ value: number }>("test");
    first!.value = 9;
    expect(await cacheGet("test")).toEqual({ value: 3 });
    expect(await cacheGet("missing")).toBeUndefined();
  });
  it("uses configured Upstash REST while recovering from an outage", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://unit.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "unit-token");
    let commands: unknown[] = [];
    server.use(
      http.post("https://unit.upstash.io", async ({ request }) => {
        commands.push(await request.json());
        return HttpResponse.json({ result: '{"cached":true}' });
      }),
    );
    const { cacheGet, cacheSet } = await import("@/lib/llm/cache");
    expect(await cacheGet("remote-only")).toEqual({ cached: true });
    expect(commands[0]).toEqual(["GET", "cache:remote-only"]);
    server.use(
      http.post(
        "https://unit.upstash.io",
        () => new HttpResponse(null, { status: 503 }),
      ),
    );
    await cacheSet("local-outage", { local: true });
    expect(await cacheGet("local-outage")).toEqual({ local: true });
    commands = [];
  });
  it("serves fallback before a model call once daily reservation exceeds cap", async () => {
    vi.stubEnv("DAILY_TOKEN_BUDGET", "1");
    server.use(
      http.post("https://api.openai.com/v1/moderations", () =>
        HttpResponse.json({ results: [{ flagged: false }] }),
      ),
    );
    const { generatePlan } = await import("@/lib/llm/generatePlan");
    const { exampleInput } = await import("@/lib/domain/planner");
    expect((await generatePlan(exampleInput())).meta.source).toBe("fallback");
    const { reserveTokens } = await import("@/lib/llm/cost");
    expect(await reserveTokens(1)).toBe(false);
  });
  it("aborting one subscriber preserves another and aborting all stops upstream", async () => {
    const { dedupeCall } = await import("@/lib/llm/dedupe");
    const one = new AbortController();
    const two = new AbortController();
    let resolve!: (value: number) => void;
    let upstream: AbortSignal | undefined;
    const work = vi.fn((signal: AbortSignal) => {
      upstream = signal;
      return new Promise<number>((r) => {
        resolve = r;
      });
    });
    const first = dedupeCall("shared", one.signal, work);
    const second = dedupeCall("shared", two.signal, work);
    await Promise.resolve();
    one.abort();
    await expect(first).rejects.toBeDefined();
    expect(upstream?.aborted).toBe(false);
    resolve(7);
    expect(await second).toBe(7);
    expect(work).toHaveBeenCalledTimes(1);
    const all = new AbortController();
    const abandoned = dedupeCall(
      "abandon",
      all.signal,
      (signal) =>
        new Promise<number>((_resolve, reject) =>
          signal.addEventListener("abort", () =>
            reject(new Error("cancelled")),
          ),
        ),
    );
    await Promise.resolve();
    all.abort();
    await expect(abandoned).rejects.toBeDefined();
  });
  it("consumer cancellation aborts SSE producer without double closing", async () => {
    const { sseResponse } = await import("@/lib/llm/sse");
    let stopped = false;
    const response = sseResponse(
      new Request("http://localhost"),
      async (send, signal) => {
        send("status", { ok: true });
        await new Promise<void>((resolve) =>
          signal.addEventListener("abort", () => {
            stopped = true;
            resolve();
          }),
        );
      },
    );
    const reader = response.body!.getReader();
    await reader.read();
    await reader.cancel();
    await Promise.resolve();
    expect(stopped).toBe(true);
  });
});

it("enhances deterministic sections through provider HTTP and caches the validated enhancement", async () => {
  let calls = 0;
  const data = {
    vision: "A welcoming celebration in Hyderabad.",
    risks: ["Arrange covered backup."],
    assumptions: ["Confirm local requirements."],
    budgetNotes: [],
    timelineNotes: [],
    vendorNotes: [],
    ideas: [
      {
        title: "Reusable celebration setting",
        description: "Choose reusable decor and shared activities.",
        whyItFits: "Fits the modern preferences.",
      },
    ],
  };
  server.use(
    http.post("https://api.openai.com/v1/moderations", () =>
      HttpResponse.json({ results: [{ flagged: false }] }),
    ),
    http.post("https://api.openai.com/v1/chat/completions", () => {
      calls++;
      return completion(JSON.stringify(data));
    }),
  );
  const { generatePlan } = await import("@/lib/llm/generatePlan");
  const { exampleInput } = await import("@/lib/domain/planner");
  const first = await generatePlan(exampleInput());
  const second = await generatePlan(exampleInput());
  expect(first.summary.oneParagraphVision).toBe(data.vision);
  expect(first.meta.source).toBe("hybrid");
  expect(first.meta.structuredValidation).toEqual({
    firstAttemptValid: true,
    repairAttempted: false,
    repairValid: null,
  });
  expect(second.meta.cached).toBe(true);
  expect(second.meta.structuredValidation).toBeUndefined();
  expect(calls).toBe(1);
  expect(first.budget.total).toBe(second.budget.total);
});
it("chat accepts streamed text and tool fragments but only proposes changes", async () => {
  server.use(
    http.post("https://api.openai.com/v1/moderations", () =>
      HttpResponse.json({ results: [{ flagged: false }] }),
    ),
    http.post("https://api.openai.com/v1/chat/completions", () => {
      const parts = [
        { content: "Review this safe change." },
        {
          tool_calls: [
            {
              index: 0,
              id: "call-1",
              type: "function",
              function: { name: "set_contingency", arguments: '{"pct":' },
            },
          ],
        },
        { tool_calls: [{ index: 0, function: { arguments: "12}" } }] },
      ];
      // EOF-terminated SSE avoids MSW's response-clone cancellation deadlock on the SDK completion sentinel.
      const body = parts
        .map(
          (delta) =>
            "data: " +
            JSON.stringify({
              id: "stream",
              object: "chat.completion.chunk",
              created: 1,
              model: "gpt-4o-mini",
              choices: [{ index: 0, delta, finish_reason: null }],
            }) +
            "\n\n",
        )
        .join("");
      return new HttpResponse(body, {
        headers: { "Content-Type": "text/event-stream" },
      });
    }),
  );
  const { POST } = await import("@/app/api/chat/route");
  const { exampleInput, createPlan } = await import("@/lib/domain/planner");
  const { compactPlanSnapshot } = await import("@/lib/llm/snapshot");
  const plan = createPlan(exampleInput());
  const original = plan.budget.contingencyPct;
  const response = await POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": crypto.randomUUID(),
      },
      body: JSON.stringify({
        plan: compactPlanSnapshot(plan),
        message: "Please set contingency to twelve percent",
      }),
    }),
  );
  const text = await response.text();
  expect(text).toContain("event: token");
  expect(text).toContain("event: tool_call");
  expect(text).toContain("set_contingency");
  expect(text).toContain('"source":"ai"');
  expect(plan.budget.contingencyPct).toBe(original);
});
