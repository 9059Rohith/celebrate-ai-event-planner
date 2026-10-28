// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { RegenerateSection } from "@/components/planner/RegenerateSection";
import { POST } from "@/app/api/plan/regenerate/route";
import * as generation from "@/lib/llm/generatePlan";
import { createPlan, exampleInput } from "@/lib/domain/planner";
import { usePlanActions } from "@/lib/hooks/usePlanActions";
import { usePlanStore } from "@/lib/store";
import type { Plan } from "@/lib/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
// This route/component contract test uses the no-provider path; never load a server SDK in jsdom.
vi.mock("@/lib/llm/client", () => ({
  getClient: () => null,
  callStructured: () => {
    throw new Error("Provider calls are disabled in this test");
  },
  moderate: () => false,
  LlmValidationError: class extends Error {},
}));
vi.mock("@/lib/security/rateLimit", () => ({
  rateLimit: async () => true,
  redis: async () => undefined,
}));
beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  localStorage.clear();
  usePlanStore.setState({
    plans: [],
    currentPlanId: null,
    history: { past: [], future: [] },
  });
  vi.stubGlobal("fetch", (_url: string, init: RequestInit) =>
    POST(
      new Request("http://localhost/api/plan/regenerate", {
        ...init,
        signal: undefined,
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": crypto.randomUUID(),
        },
      }),
    ),
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function regenerate(
  plan: Plan,
  section: "timeline" | "vendors" | "ideas",
) {
  usePlanStore.getState().addPlan(plan);
  function Harness() {
    const current = usePlanStore((s) => s.plans[0]);
    const actions = usePlanActions(current, false, () => {});
    return (
      <RegenerateSection
        plan={current}
        section={section}
        onChange={actions.change}
        onNotice={() => {}}
      />
    );
  }
  render(<Harness />);
  fireEvent.click(screen.getByText(`Refine this ${section} section`));
  fireEvent.click(screen.getByRole("button", { name: "Generate preview" }));
  await screen.findByText("Review the regenerated section");
  fireEvent.click(screen.getByRole("button", { name: "Accept section" }));
  return usePlanStore.getState().plans[0];
}

it("keeps custom run-of-show entries and all milestones through fallback refinement", async () => {
  const plan = createPlan(exampleInput());
  plan.timeline.dayOf[0] = {
    ...plan.timeline.dayOf[0],
    title: "My arrival",
    owner: "Venue lead",
    startTime: "07:15",
  };
  plan.timeline.milestones[0].notes = "Keep this detailed note. ".repeat(20);
  while (plan.timeline.milestones.length < 51)
    plan.timeline.milestones.push({
      ...plan.timeline.milestones[0],
      id: `custom-${plan.timeline.milestones.length}`,
      dependsOn: [],
    });
  const next = await regenerate(plan, "timeline");
  expect(next.timeline).toEqual(plan.timeline);
});

it("keeps vendor bookings, checklist progress and custom questions through fallback refinement", async () => {
  const plan = createPlan(exampleInput());
  plan.vendors[0].status = "booked";
  plan.vendors[0].checklist[0].done = true;
  plan.vendors[0].checklist.push({
    id: "custom",
    text: "Check quiet room",
    critical: true,
    done: true,
  });
  plan.vendors[0].questionsToAsk.push("Can we arrive at 6am?");
  expect((await regenerate(plan, "vendors")).vendors).toEqual(plan.vendors);
});

it("keeps saved ideas and their original content through fallback refinement", async () => {
  const plan = createPlan(exampleInput());
  plan.ideas[0].saved = true;
  expect((await regenerate(plan, "ideas")).ideas).toEqual(plan.ideas);
});

it("merges enhanced notes while preserving the full timeline and untouched long notes", async () => {
  const plan = createPlan(exampleInput());
  plan.timeline.dayOf[0].title = "My arrival";
  plan.timeline.milestones[0].status = "done";
  plan.timeline.milestones[1].notes = "Keep this note. ".repeat(30);
  vi.spyOn(generation, "generatePlan").mockImplementation(
    async (_input, options) => {
      const result = structuredClone(options!.currentPlan!);
      result.timeline.milestones[0].notes = "Confirm the venue entrance width.";
      result.meta.source = "hybrid";
      return result;
    },
  );
  const next = await regenerate(plan, "timeline");
  expect(next.timeline.dayOf).toEqual(plan.timeline.dayOf);
  expect(next.timeline.milestones[0]).toEqual({
    ...plan.timeline.milestones[0],
    notes: "Confirm the venue entrance width.",
  });
  expect(next.timeline.milestones[1]).toEqual(plan.timeline.milestones[1]);
});
