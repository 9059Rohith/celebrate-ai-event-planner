// @vitest-environment jsdom
import React from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { IdeasTab } from "@/components/planner/IdeasTab";
import { RegenerateSection } from "@/components/planner/RegenerateSection";
import { createPlan, exampleInput } from "@/lib/domain/planner";
import { usePlanStore } from "@/lib/store";

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
function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((done) => {
    resolve = done;
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => promise),
  );
  return resolve;
}

it("keeps a saved idea when a pending suggestion completes", async () => {
  const plan = createPlan(exampleInput());
  usePlanStore.getState().addPlan(plan);
  const resolve = deferredResponse();
  function Harness() {
    const current = usePlanStore((state) => state.plans[0]);
    return (
      <IdeasTab
        plan={current}
        readOnly={false}
        onNotice={() => {}}
        onChange={(updates) =>
          usePlanStore.getState().updatePlan(plan.id, updates)
        }
      />
    );
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Surprise me" }));
  fireEvent.click(
    screen.getByRole("button", { name: `Save ${plan.ideas[0].title}` }),
  );
  await act(async () =>
    resolve(
      Response.json({
        source: "fallback",
        ideas: [
          {
            ...plan.ideas[0],
            id: "new-idea",
            title: "New suggestion",
            saved: false,
          },
        ],
      }),
    ),
  );
  await screen.findByRole("heading", { name: "New suggestion" });
  expect(usePlanStore.getState().plans[0].ideas[0].saved).toBe(true);
});

it("does not apply a suggestion response after its tab unmounts", async () => {
  const plan = createPlan(exampleInput());
  const resolve = deferredResponse();
  const change = vi.fn();
  const view = render(
    <IdeasTab
      plan={plan}
      readOnly={false}
      onNotice={() => {}}
      onChange={change}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Surprise me" }));
  view.unmount();
  await act(async () =>
    resolve(
      Response.json({
        source: "fallback",
        ideas: [{ ...plan.ideas[0], id: "late", title: "Late suggestion" }],
      }),
    ),
  );
  expect(change).not.toHaveBeenCalled();
});

it("discards a pending preview when the selected section changes", async () => {
  const plan = createPlan(exampleInput());
  usePlanStore.getState().addPlan(plan);
  const resolve = deferredResponse();
  const change = vi.fn();
  const props = { plan, onChange: change, onNotice: vi.fn() };
  const view = render(<RegenerateSection {...props} section="timeline" />);
  fireEvent.click(screen.getByText("Refine this timeline section"));
  fireEvent.click(screen.getByRole("button", { name: "Generate preview" }));
  view.rerender(<RegenerateSection {...props} section="vendors" />);
  await act(async () =>
    resolve(
      Response.json({ refinement: { section: "timeline", changes: [] } }),
    ),
  );
  await waitFor(() =>
    expect(
      screen.queryByText("Review the regenerated section"),
    ).not.toBeInTheDocument(),
  );
  expect(change).not.toHaveBeenCalled();
});

it("does not offer a previous section's completed preview in the next section", async () => {
  const plan = createPlan(exampleInput());
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ refinement: { section: "timeline", changes: [] } }),
    ),
  );
  const props = { plan, onChange: vi.fn(), onNotice: vi.fn() };
  const view = render(<RegenerateSection {...props} section="timeline" />);
  fireEvent.click(screen.getByText("Refine this timeline section"));
  fireEvent.click(screen.getByRole("button", { name: "Generate preview" }));
  await screen.findByText("Review the regenerated section");
  view.rerender(<RegenerateSection {...props} section="ideas" />);
  expect(
    screen.queryByText("Review the regenerated section"),
  ).not.toBeInTheDocument();
});
