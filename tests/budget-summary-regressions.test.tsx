// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createPlan, exampleInput } from "@/lib/domain/planner";
import { rebalance } from "@/lib/domain/budgetEngine";
import { executeToolProposal } from "@/lib/llm/tools";
import { usePlanActions } from "@/lib/hooks/usePlanActions";
import { usePlanStore } from "@/lib/store";
import type { Plan } from "@/lib/schemas";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
beforeEach(() => {
  localStorage.clear();
  usePlanStore.setState({
    plans: [],
    currentPlanId: null,
    history: { past: [], future: [] },
  });
});
afterEach(cleanup);
function lowCateringBudget(plan: Plan) {
  const food = plan.budget.lines.find((line) => line.category === "catering")!;
  const result = rebalance(
    plan.budget.lines,
    food.id,
    { pct: 20 },
    plan.budget.total - plan.budget.contingencyAmount,
  );
  if (!result.ok) throw new Error(result.error);
  return {
    ...plan.budget,
    lines: result.lines.map((line) =>
      line.id === food.id ? { ...line, locked: true } : line,
    ),
  };
}

it("recomputes and clears catering warnings when allocations change through the workspace", () => {
  const plan = createPlan(exampleInput());
  usePlanStore.getState().addPlan(plan);
  const { result } = renderHook(() => usePlanActions(plan, false, () => {}));
  act(() => {
    result.current.change({ budget: lowCateringBudget(plan) });
  });
  expect(usePlanStore.getState().plans[0].budget.warnings.join(" ")).toContain(
    "Catering budget ₹576/guest is below typical ₹625",
  );
  act(() => {
    result.current.change({ budget: plan.budget });
  });
  expect(
    usePlanStore.getState().plans[0].budget.warnings.join(" "),
  ).not.toContain("Catering budget");
});

it("derives guest-count warnings from retained locked allocations", () => {
  const plan = createPlan(exampleInput());
  plan.budget = lowCateringBudget(plan);
  const next = executeToolProposal(plan, {
    id: "guests",
    name: "set_guest_count",
    arguments: { value: 300 },
  });
  expect(next.budget.lines).toEqual(plan.budget.lines);
  expect(next.budget.warnings.join(" ")).toContain(
    "Catering budget ₹480/guest is below typical ₹625",
  );
  expect(next.budget.perGuestCost).toBe(800000 / 300);
  const fewerGuests = executeToolProposal(next, {
    id: "fewer",
    name: "set_guest_count",
    arguments: { value: 100 },
  });
  expect(fewerGuests.budget.warnings.join(" ")).not.toContain(
    "Catering budget",
  );
});

it.each([
  { name: "set_total_budget" as const, arguments: { value: 700000 } },
  { name: "set_contingency" as const, arguments: { pct: 15 } },
])("derives $name warnings from the resulting budget", (proposal) => {
  const plan = createPlan(exampleInput());
  plan.budget = lowCateringBudget(plan);
  const next = executeToolProposal(plan, { id: "adjust", ...proposal });
  expect(
    next.budget.lines.find((line) => line.category === "catering")
      ?.allocatedAmount,
  ).toBe(144000);
  expect(next.budget.warnings.join(" ")).toContain(
    "Catering budget ₹576/guest is below typical ₹625",
  );
});

it("refreshes warnings after a chat allocation edit", () => {
  const plan = createPlan(exampleInput());
  const next = executeToolProposal(plan, {
    id: "catering",
    name: "update_budget_line",
    arguments: { category: "catering", newPct: 20 },
  });
  expect(next.budget.warnings.join(" ")).toContain(
    "Catering budget ₹576/guest is below typical ₹625",
  );
});
