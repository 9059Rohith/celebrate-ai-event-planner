import { describe, expect, it } from "vitest";
import { createPlan, exampleInput } from "@/lib/domain/planner";
import { rebalance, validateBudget } from "@/lib/domain/budgetEngine";
import { compactPlanSnapshot, hydratePlan } from "@/lib/llm/snapshot";
import {
  applySectionRefinement,
  createSectionRefinement,
} from "@/lib/llm/refinement";

describe("typed section refinements", () => {
  it("applies budget advice with exact totals and preserves notes omitted from AI context", () => {
    const plan = createPlan(exampleInput());
    plan.budget.lines[1].locked = true;
    plan.budget.lines[0].notes = "Keep this detailed estimate. ".repeat(20);
    const before = hydratePlan(compactPlanSnapshot(plan));
    const after = structuredClone(before);
    const result = rebalance(
      after.budget.lines,
      after.budget.lines[0].id,
      { pct: 20 },
      after.budget.total - after.budget.contingencyAmount,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    after.budget.lines = result.lines;
    after.budget.lines[1].notes = "Confirm the itemized catering quote.";
    const next = applySectionRefinement(
      plan,
      createSectionRefinement("budget", before, after),
      "budget",
    );
    expect(next.budget.lines[0].allocatedAmount).toBe(144000);
    expect(next.budget.lines[0].notes).toBe(plan.budget.lines[0].notes);
    expect(next.budget.lines[1]).toEqual({
      ...plan.budget.lines[1],
      notes: "Confirm the itemized catering quote.",
    });
    expect(next.budget.total).toBe(800000);
    expect(validateBudget(next.budget)).toEqual([]);
    expect(plan.budget.lines[0].allocatedAmount).not.toBe(144000);
  });

  it("appends vendor advice without replacing the user's questions or checklist", () => {
    const plan = createPlan(exampleInput());
    plan.vendors[0].questionsToAsk.push("Can our team arrive at 6am?");
    plan.vendors[0].checklist[0].done = true;
    const before = hydratePlan(compactPlanSnapshot(plan));
    const after = structuredClone(before);
    after.vendors[0].why = "Prioritize accessible arrival routes.";
    after.vendors[0].questionsToAsk.push("Is the entrance step free?");
    const next = applySectionRefinement(
      plan,
      createSectionRefinement("vendors", before, after),
      "vendors",
    );
    expect(next.vendors[0].why).toBe("Prioritize accessible arrival routes.");
    expect(next.vendors[0].questionsToAsk).toEqual([
      ...plan.vendors[0].questionsToAsk,
      "Is the entrance step free?",
    ]);
    expect(next.vendors[0].checklist).toEqual(plan.vendors[0].checklist);
  });

  it("updates idea content while retaining saves, costs, effort and omitted ideas", () => {
    const plan = createPlan(exampleInput());
    plan.ideas[0].saved = true;
    const next = applySectionRefinement(
      plan,
      {
        section: "ideas",
        changes: [
          {
            id: plan.ideas[0].id,
            title: "Accessible garden celebration",
            description: "Keep arrival paths step free.",
            whyItFits: "Welcomes every guest.",
          },
        ],
      },
      "ideas",
    );
    expect(next.ideas[0]).toEqual({
      ...plan.ideas[0],
      title: "Accessible garden celebration",
      description: "Keep arrival paths step free.",
      whyItFits: "Welcomes every guest.",
    });
    expect(next.ideas.slice(1)).toEqual(plan.ideas.slice(1));
  });

  it("rejects wrong sections, unknown or duplicate IDs and protected fields", () => {
    const plan = createPlan(exampleInput());
    const id = plan.timeline.milestones[0].id;
    const invalid = [
      { section: "ideas", changes: [] },
      {
        section: "timeline",
        changes: [{ id: "unknown", notes: "Unexpected" }],
      },
      {
        section: "timeline",
        changes: [
          { id, notes: "First" },
          { id, notes: "Second" },
        ],
      },
      { section: "timeline", changes: [{ id, status: "done" }] },
    ];
    for (const refinement of invalid)
      expect(() =>
        applySectionRefinement(plan, refinement, "timeline"),
      ).toThrow();
  });

  it("rejects locked allocation changes, changed totals and false percentages atomically", () => {
    const plan = createPlan(exampleInput());
    plan.budget.lines[0].locked = true;
    const [first, second] = plan.budget.lines;
    const distributable = plan.budget.total - plan.budget.contingencyAmount;
    const invalid = [
      [{ id: first.id, allocatedAmount: first.allocatedAmount + 1 }],
      [{ id: first.id, pct: first.minPct }],
      [
        {
          id: first.id,
          allocatedAmount: first.allocatedAmount + 1,
          pct: ((first.allocatedAmount + 1) / distributable) * 100,
        },
        {
          id: second.id,
          allocatedAmount: second.allocatedAmount - 1,
          pct: ((second.allocatedAmount - 1) / distributable) * 100,
        },
      ],
    ];
    const original = structuredClone(plan);
    for (const changes of invalid)
      expect(() =>
        applySectionRefinement(plan, { section: "budget", changes }, "budget"),
      ).toThrow(/budget constraints/);
    expect(plan).toEqual(original);
  });
});
