// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ChatTab } from "@/components/planner/ChatTab";
import { createPlan, exampleInput } from "@/lib/domain/planner";
import { usePlanStore } from "@/lib/store";
import type { Plan } from "@/lib/schemas";
vi.mock("next/dynamic", () => ({ default: () => () => null }));
let plan: Plan;
beforeEach(() => {
  localStorage.clear();
  plan = createPlan(exampleInput());
  usePlanStore.setState({
    plans: [plan],
    currentPlanId: plan.id,
    history: { past: [], future: [] },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function ChatHarness() {
  const current = usePlanStore((s) => s.plans.find((p) => p.id === plan.id)!);
  return (
    <ChatTab
      plan={current}
      readOnly={false}
      onChange={(updates) => {
        const store = usePlanStore.getState();
        store.pushHistory(store.plans.find((p) => p.id === plan.id)!);
        store.updatePlan(plan.id, updates);
      }}
      onNotice={vi.fn()}
    />
  );
}
function savedProposal() {
  const proposal = {
    id: "persistent-addition",
    name: "add_checklist_item",
    arguments: {
      vendorCategory: plan.vendors[0].category,
      text: "Confirm a quiet room",
      critical: true,
    },
  };
  localStorage.setItem(
    `celebrate-chat-${plan.id}`,
    JSON.stringify([
      {
        id: "planner-message",
        role: "Planner",
        text: "Review this checklist addition.",
        tools: [proposal],
      },
    ]),
  );
  return proposal;
}
describe("integration review regressions", () => {
  it("preserves accepted proposal decisions across tab unmount and remount without duplicating changes", async () => {
    const proposal = savedProposal();
    const originalCount = plan.vendors[0].checklist.length;
    const first = render(<ChatHarness />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Accept change" }),
    );
    await waitFor(() =>
      expect(
        usePlanStore.getState().plans[0].vendors[0].checklist,
      ).toHaveLength(originalCount + 1),
    );
    expect(
      JSON.parse(
        localStorage.getItem(`celebrate-chat-${plan.id}-decisions`) || "{}",
      )[proposal.id].status,
    ).toBe("accepted");
    first.unmount();
    render(<ChatHarness />);
    await screen.findByText("accepted");
    expect(
      screen.queryByRole("button", { name: "Accept change" }),
    ).not.toBeInTheDocument();
    expect(usePlanStore.getState().plans[0].vendors[0].checklist).toHaveLength(
      originalCount + 1,
    );
    fireEvent.click(screen.getByRole("button", { name: "Undo change" }));
    expect(usePlanStore.getState().plans[0].vendors[0].checklist).toHaveLength(
      originalCount,
    );
    expect(screen.getByText("undone")).toBeInTheDocument();
  });
  it("preserves dismissed decisions when reopening Chat", async () => {
    savedProposal();
    const first = render(<ChatHarness />);
    fireEvent.click(await screen.findByRole("button", { name: "Dismiss" }));
    first.unmount();
    render(<ChatHarness />);
    await screen.findByText("dismissed");
    expect(
      screen.queryByRole("button", { name: "Accept change" }),
    ).not.toBeInTheDocument();
    expect(usePlanStore.getState().plans[0].vendors[0].checklist).toEqual(
      plan.vendors[0].checklist,
    );
  });
  it("clears prior plan history when adding a new or imported plan and cannot undo into another plan", () => {
    const store = usePlanStore.getState();
    store.pushHistory(plan);
    store.updatePlan(plan.id, {
      summary: { ...plan.summary, headline: "Keep this edited original" },
    });
    const original = usePlanStore.getState().plans[0];
    const second = createPlan(exampleInput("birthday"));
    usePlanStore.getState().addPlan(second);
    usePlanStore.getState().setCurrentPlan(second.id);
    expect(usePlanStore.getState().history).toEqual({ past: [], future: [] });
    expect(usePlanStore.getState().undo()).toBeNull();
    expect(usePlanStore.getState().plans.find((p) => p.id === plan.id)).toEqual(
      original,
    );
    expect(
      usePlanStore.getState().plans.find((p) => p.id === second.id),
    ).toEqual(second);
  });
  it("new plan undo/redo stays isolated from the previously edited plan", () => {
    usePlanStore.getState().pushHistory(plan);
    usePlanStore.getState().updatePlan(plan.id, {
      summary: { ...plan.summary, headline: "Original edit" },
    });
    const original = usePlanStore.getState().plans[0];
    const second = createPlan(exampleInput("community"));
    usePlanStore.getState().addPlan(second);
    usePlanStore.getState().pushHistory(second);
    usePlanStore.getState().updatePlan(second.id, {
      summary: { ...second.summary, headline: "Second edit" },
    });
    usePlanStore.getState().undo();
    expect(usePlanStore.getState().getCurrentPlan()?.summary.headline).toBe(
      second.summary.headline,
    );
    usePlanStore.getState().redo();
    expect(usePlanStore.getState().getCurrentPlan()?.summary.headline).toBe(
      "Second edit",
    );
    expect(usePlanStore.getState().plans.find((p) => p.id === plan.id)).toEqual(
      original,
    );
  });
});
