import { afterEach, expect, it, vi } from "vitest";
import { createPlan, exampleInput } from "@/lib/domain/planner";
import { executeToolProposal } from "@/lib/llm/tools";
import { generateICS } from "@/lib/domain/timelineEngine";
import { evaluate } from "@/evals/metrics";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
function at(instant: string) {
  vi.stubEnv("TZ", "UTC");
  vi.useFakeTimers();
  vi.setSystemTime(new Date(instant));
}

it.each([
  ["2026-10-28T18:15:00Z", "2026-10-28"],
  ["2026-10-28T18:45:00Z", "2026-10-29"],
])(
  "uses the India planning date at %s for templates, chat and calendar export",
  (instant, expectedDate) => {
    at(instant);
    const plan = createPlan({ ...exampleInput(), date: "2026-10-28" });
    const next = executeToolProposal(plan, {
      id: "add",
      name: "add_milestone",
      arguments: {
        title: "Confirm venue arrival",
        dueOffsetDays: -7,
        priority: "must",
        category: "venue",
        notes: "",
      },
    });
    expect(plan.timeline.milestones[0].dueDate).toBe(expectedDate);
    expect(next.timeline.milestones.at(-1)?.dueDate).toBe(expectedDate);
    expect(
      generateICS([next.timeline.milestones.at(-1)!], "Celebration"),
    ).toContain(`DTSTART;VALUE=DATE:${expectedDate.replaceAll("-", "")}`);
  },
);

it("uses the same date policy for an edited milestone and planning-week horizon", () => {
  at("2026-10-28T18:45:00Z");
  const plan = createPlan({ ...exampleInput(), planningWeeks: 1 });
  expect(plan.timeline.eventDate).toBe("2026-11-05");
  const next = executeToolProposal(plan, {
    id: "edit",
    name: "update_milestone",
    arguments: { id: plan.timeline.milestones[0].id, dueOffsetDays: -30 },
  });
  expect(next.timeline.milestones[0].dueDate).toBe("2026-10-29");
});

it("recognizes yesterday's event in the summary after India midnight", () => {
  at("2026-10-28T18:45:00Z");
  const plan = createPlan({ ...exampleInput(), date: "2026-10-28" });
  expect(plan.summary.keyRisks.join(" ")).toContain("Past event date");
});

it("evaluates clamped deadlines against the same India date after midnight", () => {
  const instant = "2026-10-28T18:45:00Z";
  at(instant);
  const input = { ...exampleInput(), date: "2026-10-28" };
  const plan = createPlan(input);
  expect(
    plan.timeline.milestones.every(
      (milestone) => milestone.dueDate === "2026-10-29",
    ),
  ).toBe(true);
  expect(
    evaluate(
      {
        id: "india-midnight",
        input,
        tags: [],
        expectations: { budgetFeasible: true },
      },
      plan,
      new Date(instant),
    ).timelineValid.passed,
  ).toBe(true);
});
