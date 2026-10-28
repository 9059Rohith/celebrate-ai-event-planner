import type { Plan } from "@/lib/schemas";
import type { PlanSnapshot } from "@/lib/llm/snapshot";

/** Browser transport only: importing this module never loads template engines. */
export function compactPlanSnapshot(plan: Plan): PlanSnapshot {
  return {
    snapshot: true,
    input: plan.input,
    budget: {
      ...plan.budget,
      lines: plan.budget.lines.map((line) => ({
        ...line,
        notes: line.notes.slice(0, 200),
      })),
    },
    milestones: plan.timeline.milestones.slice(0, 50).map((milestone) => ({
      ...milestone,
      notes: milestone.notes.slice(0, 120),
    })),
    ideas: plan.ideas
      .slice(0, 50)
      .map(({ id, title, kind, tags, estCost }) => ({
        id,
        title,
        kind,
        tags,
        estCost,
      })),
    vendors: plan.vendors
      .slice(0, 50)
      .map(({ id, category, status }) => ({ id, category, status })),
  };
}
