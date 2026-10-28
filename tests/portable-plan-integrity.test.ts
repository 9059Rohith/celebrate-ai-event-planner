import { describe, expect, it } from "vitest";
import LZString from "lz-string";
import { createPlan, exampleInput } from "@/lib/domain/planner";
import { migratePlans } from "@/lib/client/planStorage";
import { decodePlan } from "@/lib/share";
import type { Plan } from "@/lib/schemas";

const corruptions: Array<[string, (plan: Plan) => void]> = [
  [
    "duplicate budget IDs",
    (p) => {
      p.budget.lines[1].id = p.budget.lines[0].id;
    },
  ],
  [
    "duplicate milestone IDs",
    (p) => {
      p.timeline.milestones[1].id = p.timeline.milestones[0].id;
    },
  ],
  [
    "duplicate schedule IDs",
    (p) => {
      p.timeline.dayOf[1].id = p.timeline.dayOf[0].id;
    },
  ],
  [
    "duplicate vendor IDs",
    (p) => {
      p.vendors[1].id = p.vendors[0].id;
    },
  ],
  [
    "duplicate checklist IDs",
    (p) => {
      p.vendors[0].checklist[1].id = p.vendors[0].checklist[0].id;
    },
  ],
  [
    "duplicate idea IDs",
    (p) => {
      p.ideas[1].id = p.ideas[0].id;
    },
  ],
  [
    "blank row IDs",
    (p) => {
      p.timeline.milestones[0].id = " ";
    },
  ],
  [
    "allocations exceeding the total",
    (p) => {
      p.budget.lines[0].allocatedAmount += 1000;
    },
  ],
  [
    "fractional allocations with a balanced sum",
    (p) => {
      p.budget.lines[0].allocatedAmount += 0.5;
      p.budget.lines[1].allocatedAmount -= 0.5;
    },
  ],
  [
    "currency differing from the event",
    (p) => {
      p.budget.currency = "USD";
    },
  ],
  [
    "budget differing from the intake",
    (p) => {
      p.input.totalBudget += 1;
    },
  ],
  [
    "incorrect per-guest cost",
    (p) => {
      p.budget.perGuestCost = 1;
    },
  ],
  [
    "reserve amount inconsistent with its percentage",
    (p) => {
      p.budget.contingencyAmount += 1;
      p.budget.lines[0].allocatedAmount -= 1;
    },
  ],
];

describe("portable plan integrity", () => {
  it.each(corruptions)(
    "rejects %s in shared and persisted plans while retaining valid siblings",
    (_name, corrupt) => {
      const good = createPlan(exampleInput());
      const bad = structuredClone(good);
      bad.id = "corrupt-plan";
      corrupt(bad);
      expect(
        decodePlan(
          LZString.compressToEncodedURIComponent(JSON.stringify(bad)),
        ) === null,
      ).toBe(true);
      const restored = migratePlans({
        plans: [bad, good],
        currentPlanId: bad.id,
      });
      expect(restored.plans.map((plan) => plan.id)).toEqual([good.id]);
      expect(restored.currentPlanId).toBeNull();
    },
  );

  it("preserves overdue dates, custom rows, locks and operational progress", () => {
    const plan = createPlan(exampleInput());
    plan.timeline.eventDate = "2020-01-01";
    plan.timeline.milestones[0].dueDate = "2019-12-15";
    plan.timeline.milestones[0].status = "done";
    plan.timeline.milestones[0].notes =
      "Keep this signed-contract detail.\n".repeat(20);
    plan.timeline.dayOf[0].owner = "Venue lead";
    plan.budget.lines[0].locked = true;
    plan.vendors[0].status = "confirmed";
    plan.vendors[0].checklist.push({
      id: "custom-access",
      text: "Confirm the quiet room",
      done: true,
      critical: true,
    });
    plan.ideas[0].saved = true;
    const serialized = JSON.parse(JSON.stringify(plan));
    expect(
      decodePlan(LZString.compressToEncodedURIComponent(JSON.stringify(plan))),
    ).toEqual(serialized);
    expect(migratePlans({ plans: [plan], currentPlanId: plan.id })).toEqual({
      plans: [plan],
      currentPlanId: plan.id,
    });
  });

  it("accepts a fractional per-guest quotient while keeping monetary allocations whole", () => {
    const plan = createPlan(exampleInput());
    plan.input.guestCount = 3;
    plan.budget.perGuestCost = 800000 / 3;
    expect(
      decodePlan(LZString.compressToEncodedURIComponent(JSON.stringify(plan)))
        ?.budget.perGuestCost,
    ).toBe(800000 / 3);
  });

  it("restores only one unambiguous owner for repeated persisted plan IDs", () => {
    const plan = createPlan(exampleInput());
    expect(
      migratePlans({
        plans: [plan, structuredClone(plan)],
        currentPlanId: plan.id,
      }).plans.map((item) => item.id),
    ).toEqual([plan.id]);
  });
});
