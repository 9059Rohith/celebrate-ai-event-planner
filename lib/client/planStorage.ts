import { PlanSchema, type Plan } from "@/lib/schemas";

export function migratePlans(raw: unknown): {
  plans: Plan[];
  currentPlanId: string | null;
} {
  const state =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const plans = Array.isArray(state.plans)
    ? state.plans.flatMap((value) => {
        const result = PlanSchema.safeParse(value);
        return result.success ? [result.data] : [];
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
