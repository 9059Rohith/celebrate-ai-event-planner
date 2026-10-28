import type { Plan } from "@/lib/schemas";
import { parsePortablePlan } from "./portablePlan";

export function migratePlans(raw: unknown): {
  plans: Plan[];
  currentPlanId: string | null;
} {
  const state =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const seen = new Set<string>();
  const plans = Array.isArray(state.plans)
    ? state.plans.flatMap((value) => {
        try {
          const plan = parsePortablePlan(value);
          if (seen.has(plan.id)) return [];
          seen.add(plan.id);
          return [plan];
        } catch {
          return [];
        }
      })
    : [];
  return {
    plans,
    currentPlanId:
      typeof state.currentPlanId === "string" &&
      plans.some((p) => p.id === state.currentPlanId)
        ? state.currentPlanId
        : null,
  };
}
