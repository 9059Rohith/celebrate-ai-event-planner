import { PlanSchema, type Plan } from "@/lib/schemas";

function uniqueIds(rows: Array<{ id: string }>): boolean {
  return (
    rows.every((row) => row.id.trim().length > 0) &&
    new Set(rows.map((row) => row.id)).size === rows.length
  );
}

/** Validate complete external plans without importing generation templates. */
export function parsePortablePlan(value: unknown): Plan {
  const plan = PlanSchema.parse(value);
  const collections = [
    plan.budget.lines,
    plan.timeline.milestones,
    plan.timeline.dayOf,
    plan.vendors,
    plan.ideas,
    ...plan.vendors.map((vendor) => vendor.checklist),
  ];
  if (!plan.id.trim() || !collections.every(uniqueIds))
    throw new Error("Plan items must have unique, nonempty identifiers.");

  const { budget, input } = plan;
  const allocated = budget.lines.reduce(
    (sum, line) => sum + line.allocatedAmount,
    0,
  );
  if (
    !Number.isSafeInteger(budget.total) ||
    !Number.isSafeInteger(budget.contingencyAmount) ||
    !Number.isSafeInteger(allocated) ||
    budget.lines.some((line) => !Number.isSafeInteger(line.allocatedAmount)) ||
    budget.total !== input.totalBudget ||
    budget.currency !== input.currency ||
    allocated + budget.contingencyAmount !== budget.total ||
    budget.contingencyAmount !==
      Math.round((budget.total * budget.contingencyPct) / 100) ||
    Math.abs(budget.perGuestCost - budget.total / input.guestCount) > 1e-6
  )
    throw new Error("Plan budget amounts are inconsistent with the event.");
  return plan;
}
