// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createPlan, exampleInput } from "@/lib/domain/planner";
import { useSectionRefinement } from "@/lib/hooks/useSectionRefinement";
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
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function setup() {
  const first = createPlan(exampleInput());
  const second = createPlan(exampleInput("birthday"));
  usePlanStore.getState().addPlan(first);
  usePlanStore.getState().addPlan(second);
  const hook = renderHook(
    ({ plan }: { plan: Plan }) => {
      const actions = usePlanActions(plan, false, () => {});
      return useSectionRefinement({
        plan,
        section: "budget",
        onChange: actions.change,
        onNotice: () => {},
      });
    },
    { initialProps: { plan: first } },
  );
  return { first, second, ...hook };
}
it("clears a completed preview when another plan has the same revision", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json({ refinement: { section: "budget", changes: [] } }),
  );
  const { first, second, result, rerender } = setup();
  await act(async () => result.current.request("Optimize"));
  expect(result.current.preview?.total).toBe(first.budget.total);
  rerender({ plan: second });
  expect(result.current.preview).toBeNull();
  act(() => {
    result.current.accept();
  });
  expect(usePlanStore.getState().plans.find((p) => p.id === second.id)).toEqual(
    second,
  );
});
it("clears busy state on plan switch and ignores the canceled response", async () => {
  let resolve!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    () =>
      new Promise<Response>((done) => {
        resolve = done;
      }),
  );
  const { second, result, rerender } = setup();
  let request!: Promise<void>;
  act(() => {
    request = result.current.request("Optimize");
  });
  expect(result.current.busy).toBe(true);
  rerender({ plan: second });
  expect(result.current.busy).toBe(false);
  await act(async () => {
    resolve(Response.json({ refinement: { section: "budget", changes: [] } }));
    await request;
  });
  expect(result.current.preview).toBeNull();
  expect(usePlanStore.getState().plans.find((p) => p.id === second.id)).toEqual(
    second,
  );
});
