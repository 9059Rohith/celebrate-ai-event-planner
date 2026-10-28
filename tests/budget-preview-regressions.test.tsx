// @vitest-environment jsdom
import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { BudgetTab } from "@/components/planner/BudgetTab";
import { createPlan, exampleInput } from "@/lib/domain/planner";
import { usePlanActions } from "@/lib/hooks/usePlanActions";
import { usePlanStore } from "@/lib/store";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
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
  const plan = createPlan(exampleInput());
  usePlanStore.getState().addPlan(plan);
  const notice = vi.fn();
  function Harness() {
    const current =
      usePlanStore((s) => s.plans.find((p) => p.id === plan.id)) ?? plan;
    const actions = usePlanActions(current, false, notice);
    return (
      <BudgetTab
        plan={current}
        readOnly={false}
        onChange={actions.change}
        onNotice={notice}
      />
    );
  }
  const view = render(<Harness />);
  return { plan, notice, ...view };
}
function pendingBudget() {
  let resolve!: (response: Response) => void;
  let signal: AbortSignal | null | undefined;
  vi.stubGlobal("fetch", (_url: string, init: RequestInit) => {
    signal = init.signal;
    return new Promise<Response>((done) => {
      resolve = done;
    });
  });
  return {
    finish: () =>
      resolve(
        Response.json({ refinement: { section: "budget", changes: [] } }),
      ),
    signal: () => signal,
  };
}

it("keeps a new lock when an older optimization preview is accepted", async () => {
  const { plan, notice } = setup();
  const request = pendingBudget();
  fireEvent.click(screen.getByRole("button", { name: "Ask AI to optimize" }));
  await act(async () => request.finish());
  fireEvent.click(
    screen.getByRole("button", { name: `Lock ${plan.budget.lines[0].label}` }),
  );
  const before = usePlanStore.getState().plans[0];
  fireEvent.click(screen.getByRole("button", { name: "Accept suggestion" }));
  expect(usePlanStore.getState().plans[0]).toEqual(before);
  expect(notice).toHaveBeenLastCalledWith(
    expect.stringMatching(/changed|fresh/i),
  );
});

it("rejects a preview after edit and undo even when the original content returns", async () => {
  const { plan } = setup();
  const request = pendingBudget();
  fireEvent.click(screen.getByRole("button", { name: "Ask AI to optimize" }));
  await act(async () => request.finish());
  fireEvent.click(
    screen.getByRole("button", { name: `Lock ${plan.budget.lines[0].label}` }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  const before = usePlanStore.getState().plans[0];
  const history = usePlanStore.getState().history;
  fireEvent.click(screen.getByRole("button", { name: "Accept suggestion" }));
  expect(usePlanStore.getState().plans[0]).toEqual(before);
  expect(usePlanStore.getState().history).toEqual(history);
});

it("cancels optimization and its animation frame when the budget tab unmounts", async () => {
  const callbacks = new Map<number, FrameRequestCallback>();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callbacks.set(1, callback);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    callbacks.delete(id);
  });
  const { plan, unmount } = setup();
  const request = pendingBudget();
  fireEvent.click(screen.getByRole("button", { name: "Ask AI to optimize" }));
  fireEvent.change(
    screen.getByLabelText(`${plan.budget.lines[0].label} allocation`),
    { target: { value: "20" } },
  );
  unmount();
  await act(async () => {
    for (const callback of callbacks.values()) callback(0);
    request.finish();
  });
  expect(usePlanStore.getState().plans[0]).toEqual(plan);
  expect(request.signal()?.aborted).toBe(true);
});

it("rebalances against the current lock state when a queued slider frame runs", () => {
  let callback!: FrameRequestCallback;
  vi.stubGlobal("requestAnimationFrame", (next: FrameRequestCallback) => {
    callback = next;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  const { plan } = setup();
  fireEvent.change(
    screen.getByLabelText(`${plan.budget.lines[0].label} allocation`),
    { target: { value: "20" } },
  );
  fireEvent.click(
    screen.getByRole("button", { name: `Lock ${plan.budget.lines[0].label}` }),
  );
  const before = usePlanStore.getState().plans[0];
  act(() => callback(0));
  expect(usePlanStore.getState().plans[0]).toEqual(before);
});
