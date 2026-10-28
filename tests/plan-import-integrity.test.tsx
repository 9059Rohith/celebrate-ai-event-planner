// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import MyPlans from "@/components/home/MyPlans";
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
afterEach(cleanup);

it.each(["duplicate IDs", "inconsistent money"])(
  "rejects an imported file with %s without replacing saved plans",
  async (corruption) => {
    const existing = createPlan(exampleInput());
    usePlanStore.getState().addPlan(existing);
    const imported = structuredClone(existing);
    imported.summary.headline = "Corrupt imported celebration";
    if (corruption === "duplicate IDs")
      imported.timeline.milestones[1].id = imported.timeline.milestones[0].id;
    else imported.budget.lines[0].allocatedAmount += 1000;
    const json = JSON.stringify(imported);
    const file = new File([json], "celebration.json", {
      type: "application/json",
    });
    Object.defineProperty(file, "text", { value: async () => json });
    const view = render(<MyPlans />);
    fireEvent.change(view.container.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /valid exported plan/,
    );
    expect(usePlanStore.getState().plans).toEqual([existing]);
    expect(
      screen.queryByRole("link", { name: "Corrupt imported celebration" }),
    ).not.toBeInTheDocument();
  },
);
