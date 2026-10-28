import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("OPENAI_API_KEY", "test-not-a-real-key");
  vi.stubEnv("OPENAI_MODEL", "gpt-4o-mini");
  vi.stubEnv("OPENAI_MAX_RETRIES", "0");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  server.use(
    http.post("https://api.openai.com/v1/moderations", () =>
      HttpResponse.json({ results: [{ flagged: false }] }),
    ),
  );
});
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});
function completion(data: unknown) {
  return HttpResponse.json({
    choices: [
      { message: { content: JSON.stringify(data) }, finish_reason: "stop" },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 10 },
  });
}
function enhancement() {
  return {
    vision: "A welcoming celebration.",
    risks: [],
    assumptions: [],
    budgetNotes: [],
    timelineNotes: [] as Array<{ id: string; notes: string }>,
    vendorNotes: [],
    ideas: [],
  };
}
function provider() {
  const calls: string[] = [];
  server.use(
    http.post(
      "https://api.openai.com/v1/chat/completions",
      async ({ request }) => {
        const body = (await request.json()) as {
          model: string;
          messages: Array<{ role: string; content: string }>;
        };
        calls.push(body.model);
        const message = body.messages.find((m) => m.role === "user")!.content;
        const context = JSON.parse(
          message.match(/<user_input>\n([\s\S]*)\n<\/user_input>/)![1],
        ) as { milestones: Array<{ id: string }> };
        return completion({
          ...enhancement(),
          vision: `Celebration planned with ${body.model}.`,
          timelineNotes: [
            {
              id: context.milestones[0].id,
              notes: "Confirm a step-free entrance.",
            },
          ],
        });
      },
    ),
  );
  return calls;
}

it("reuses cached milestone advice with each new plan's real IDs", async () => {
  const calls = provider();
  const { generatePlan } = await import("@/lib/llm/generatePlan");
  const { exampleInput } = await import("@/lib/domain/planner");
  const first = await generatePlan(exampleInput());
  const second = await generatePlan(exampleInput());
  expect(calls).toHaveLength(1);
  expect(first.timeline.milestones[0].notes).toBe(
    "Confirm a step-free entrance.",
  );
  expect(second.timeline.milestones[0].notes).toBe(
    "Confirm a step-free entrance.",
  );
  expect(second.meta.cached).toBe(true);
});

it("invalidates cached enhancements when the selected model changes", async () => {
  const calls = provider();
  const { generatePlan } = await import("@/lib/llm/generatePlan");
  const { exampleInput } = await import("@/lib/domain/planner");
  vi.stubEnv("OPENAI_MODEL", "model-a");
  await generatePlan(exampleInput());
  vi.stubEnv("OPENAI_MODEL", "model-b");
  const second = await generatePlan(exampleInput());
  expect(calls).toEqual(["model-a", "model-b"]);
  expect(second.summary.oneParagraphVision).toBe(
    "Celebration planned with model-b.",
  );
  expect(second.meta.model).toBe("model-b");
});

it("invalidates enhancements after custom milestone or vendor context changes", async () => {
  const calls = provider();
  const { generatePlan } = await import("@/lib/llm/generatePlan");
  const { exampleInput, createPlan } = await import("@/lib/domain/planner");
  const plan = createPlan(exampleInput());
  await generatePlan(plan.input, { currentPlan: plan });
  plan.timeline.milestones[0].title = "Confirm the accessible entrance";
  await generatePlan(plan.input, { currentPlan: plan });
  plan.vendors[0].category = "accessibility-coordinator";
  await generatePlan(plan.input, { currentPlan: plan });
  expect(calls).toHaveLength(3);
});

it("leaves omitted multiline budget and milestone notes unchanged during enhancement", async () => {
  server.use(
    http.post("https://api.openai.com/v1/chat/completions", () =>
      completion(enhancement()),
    ),
  );
  const { generatePlan } = await import("@/lib/llm/generatePlan");
  const { exampleInput, createPlan } = await import("@/lib/domain/planner");
  const { compactPlanSnapshot, hydratePlan } =
    await import("@/lib/llm/snapshot");
  const { createSectionRefinement, applySectionRefinement } =
    await import("@/lib/llm/refinement");
  const plan = createPlan(exampleInput());
  plan.timeline.milestones[0].notes =
    "Line one\nLine two with details. ".repeat(20);
  plan.budget.lines[0].notes = "Quote details\nPayment dates. ".repeat(20);
  const before = hydratePlan(compactPlanSnapshot(plan));
  const after = await generatePlan(plan.input, { currentPlan: before });
  for (const section of ["budget", "timeline"] as const) {
    const next = applySectionRefinement(
      plan,
      createSectionRefinement(section, before, after),
      section,
    );
    expect(next[section]).toEqual(plan[section]);
  }
});

it("returns an empty budget refinement when the provider proposes no changes", async () => {
  server.use(
    http.post("https://api.openai.com/v1/chat/completions", () =>
      completion({ notes: [], suggestions: [] }),
    ),
  );
  const { POST } = await import("@/app/api/plan/regenerate/route");
  const { exampleInput, createPlan } = await import("@/lib/domain/planner");
  const { compactPlanSnapshot } = await import("@/lib/llm/snapshot");
  const plan = createPlan(exampleInput());
  plan.budget.lines[0].notes = "Quote details\nPayment dates. ".repeat(20);
  const response = await POST(
    new Request("http://localhost/api/plan/regenerate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": crypto.randomUUID(),
      },
      body: JSON.stringify({
        plan: compactPlanSnapshot(plan),
        section: "budget",
      }),
    }),
  );
  expect(response.status).toBe(200);
  expect((await response.json()).refinement).toEqual({
    section: "budget",
    changes: [],
  });
});
