import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/plan/generate/route";
import { createPlan, exampleInput } from "@/lib/domain/planner";
import { compactPlanSnapshot } from "@/lib/llm/snapshot";
import * as generation from "@/lib/llm/generatePlan";
import { consumeSSE } from "@/lib/client/network";

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

const request = (body: unknown) =>
  new Request("http://localhost/api/plan/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

it("returns an explicit no-op refinement when AI is unavailable for a saved plan", async () => {
  const plan = createPlan(exampleInput());
  plan.summary.headline = "Imported custom headline";
  plan.summary.oneParagraphVision = "My own detailed vision";
  plan.timeline.milestones[0].notes = "Keep this multiline note.\n".repeat(20);
  const response = await POST(
    request({ mode: "refine", plan: compactPlanSnapshot(plan) }),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("application/json");
  const data = await response.json();
  expect(data.meta.source).toBe("fallback");
  expect(data.summary).toEqual({});
  expect(data.sections).toEqual([
    { section: "budget", changes: [] },
    { section: "timeline", changes: [] },
    { section: "vendors", changes: [] },
    { section: "ideas", changes: [] },
  ]);
});

it("returns only changed prose tied to saved row IDs rather than replacement sections", async () => {
  const plan = createPlan(exampleInput());
  plan.timeline.milestones[0].status = "done";
  vi.spyOn(generation, "generatePlan").mockImplementation(
    async (_input, options) => {
      const next = structuredClone(options!.currentPlan!);
      next.summary.oneParagraphVision = "A personalized garden celebration.";
      next.timeline.milestones[0].notes = "Confirm the accessible entrance.";
      next.meta.source = "hybrid";
      return next;
    },
  );
  const response = await POST(
    request({ mode: "refine", plan: compactPlanSnapshot(plan) }),
  );
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.summary).toEqual({
    oneParagraphVision: "A personalized garden celebration.",
  });
  expect(
    data.sections.find((s: { section: string }) => s.section === "timeline"),
  ).toEqual({
    section: "timeline",
    changes: [
      {
        id: plan.timeline.milestones[0].id,
        notes: "Confirm the accessible entrance.",
      },
    ],
  });
  expect(data).not.toHaveProperty("timeline");
  expect(data).not.toHaveProperty("input");
});

it("keeps intake-only initial generation as a complete SSE plan", async () => {
  const response = await POST(request(exampleInput()));
  const events: Array<{ event: string; data: unknown }> = [];
  await consumeSSE(response, (event, data) => events.push({ event, data }));
  expect(response.headers.get("content-type")).toContain("text/event-stream");
  expect(events.at(-1)).toMatchObject({
    event: "complete",
    data: { input: { guestCount: 250 }, meta: { source: "fallback" } },
  });
  expect(events.some((event) => event.event === "timeline")).toBe(true);
});

it("rejects malformed or oversized saved-plan requests before enhancement", async () => {
  expect(
    (await POST(request({ mode: "refine", plan: { id: "incomplete" } })))
      .status,
  ).toBe(400);
  expect(
    (await POST(request({ mode: "refine", plan: "x".repeat(33000) }))).status,
  ).toBe(413);
});
