// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { axe } from "jest-axe";
import { Header } from "@/components/common/Header";
import { BudgetTab } from "@/components/planner/BudgetTab";
import { ChatTab } from "@/components/planner/ChatTab";
import { VendorsTab } from "@/components/planner/VendorsTab";
import { TimelineTab } from "@/components/planner/TimelineTab";
import { createPlan, exampleInput } from "@/lib/domain/planner";
import { usePlanStore } from "@/lib/store";
import { TextDialog } from "@/components/ui/TextDialog";
import type { Plan } from "@/lib/schemas";
import NewPlan from "@/app/plan/new/page";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
let p: Plan;
beforeEach(() => {
  p = createPlan(exampleInput());
  usePlanStore.setState({
    plans: [p],
    currentPlanId: p.id,
    history: { past: [], future: [] },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("accessible product controls", () => {
  it("shows exactly one wizard step and validates the step flow", async () => {
    render(<NewPlan />);
    expect(
      screen.getByLabelText("Give your celebration a name"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Number of guests")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue" }),
    );
    await screen.findByLabelText("Number of guests");
    expect(
      screen.queryByLabelText("Give your celebration a name"),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue" }),
    );
    await screen.findByText("Dietary needs");
    expect(screen.queryByLabelText("Number of guests")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue" }),
    );
    await screen.findByText("Wedding functions");
    expect(screen.queryByText("Dietary needs")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue" }),
    );
    await screen.findByRole("button", { name: "Create my celebration" });
    expect(screen.queryByText("Wedding functions")).not.toBeInTheDocument();
  });
  it("has no authentication controls and header passes axe", async () => {
    const { container } = render(<Header />);
    for (const control of screen
      .queryAllByRole("button")
      .concat(screen.queryAllByRole("link")))
      expect(control.textContent).not.toMatch(
        /log ?in|sign ?in|sign ?up|register|account/i,
      );
    expect((await axe(container)).violations).toEqual([]);
  });
  it("adds a custom vendor checklist through accessible dialog", async () => {
    const change = vi.fn();
    render(<VendorsTab plan={p} readOnly={false} onChange={change} />);
    fireEvent.click(
      screen.getAllByRole("button", { name: "Add checklist item" })[0],
    );
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Confirm a quiet room" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add to plan" }));
    expect(change.mock.calls[0][0].vendors[0].checklist.at(-1).text).toBe(
      "Confirm a quiet room",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("validates dialog description and supports cancellation", () => {
    render(
      <TextDialog
        title="Add detail"
        trigger={<button>Open</button>}
        onSubmit={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Add detail");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("rebalances budget without changing total and respects locks", async () => {
    const change = vi.fn();
    render(
      <BudgetTab
        plan={p}
        readOnly={false}
        onChange={change}
        onNotice={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Venue & Rentals allocation"), {
      target: { value: "20" },
    });
    await waitFor(() => expect(change).toHaveBeenCalled());
    const budget = change.mock.calls[0][0].budget;
    expect(
      budget.lines.reduce(
        (s: number, l: { allocatedAmount: number }) => s + l.allocatedAmount,
        0,
      ) + budget.contingencyAmount,
    ).toBe(p.budget.total);
    fireEvent.click(
      screen.getByRole("button", { name: "Lock Venue & Rentals" }),
    );
    expect(change.mock.calls.at(-1)?.[0].budget.lines[0].locked).toBe(true);
  });
  it("shared budget and vendor controls cannot mutate", () => {
    const change = vi.fn();
    const { unmount } = render(
      <BudgetTab plan={p} readOnly onChange={change} onNotice={vi.fn()} />,
    );
    expect(screen.getByLabelText("Venue & Rentals allocation")).toBeDisabled();
    unmount();
    render(<VendorsTab plan={p} readOnly onChange={change} />);
    expect(
      screen
        .getAllByRole("checkbox")
        .every((c) => (c as HTMLInputElement).disabled),
    ).toBe(true);
    expect(change).not.toHaveBeenCalled();
  });
  it("timeline exposes edit and checklist controls", () => {
    const change = vi.fn();
    render(<TimelineTab plan={p} readOnly={false} onChange={change} />);
    expect(
      screen.getByRole("heading", { name: /From today/ }),
    ).toBeInTheDocument();
    const status = screen.getByLabelText(
      `Status for ${p.timeline.milestones[0].title}`,
    );
    fireEvent.change(status, { target: { value: "done" } });
    expect(change.mock.calls[0][0].timeline.milestones[0].status).toBe("done");
    expect(screen.getByText(/run of show/i)).toBeInTheDocument();
  });
  it("requires explicit approval for streamed tool proposals, then supports undo", async () => {
    const proposal = {
      id: "proposal-1",
      name: "set_guest_count",
      arguments: { value: 100 },
    };
    const enc = new TextEncoder();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            new ReadableStream({
              start(c) {
                c.enqueue(
                  enc.encode(
                    `event: token\ndata: ${JSON.stringify({ text: "Review this change." })}\n\nevent: tool_call\ndata: ${JSON.stringify(proposal)}\n\nevent: complete\ndata: ${JSON.stringify({ answer: "Review this change.", toolCalls: [proposal], source: "fallback" })}\n\n`,
                  ),
                );
                c.close();
              },
            }),
            { headers: { "Content-Type": "text/event-stream" } },
          ),
      ),
    );
    function Harness() {
      const plan = usePlanStore((s) => s.plans[0]);
      return (
        <ChatTab
          plan={plan}
          readOnly={false}
          onChange={(updates) => {
            usePlanStore.getState().pushHistory(plan);
            usePlanStore.getState().updatePlan(plan.id, updates);
          }}
          onNotice={vi.fn()}
        />
      );
    }
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Message the planner"), {
      target: { value: "Set guests to 100" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByRole("button", { name: "Accept change" });
    expect(usePlanStore.getState().plans[0].input.guestCount).toBe(250);
    fireEvent.click(screen.getByRole("button", { name: "Accept change" }));
    await waitFor(() =>
      expect(usePlanStore.getState().plans[0].input.guestCount).toBe(100),
    );
    fireEvent.click(screen.getByRole("button", { name: "Undo change" }));
    expect(usePlanStore.getState().plans[0].input.guestCount).toBe(250);
  });
});

