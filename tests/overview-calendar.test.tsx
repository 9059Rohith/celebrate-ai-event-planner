// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { OverviewTab } from "@/components/planner/OverviewTab";
import { createPlan, exampleInput } from "@/lib/domain/planner";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it.each([
  ["2026-10-29", "Today"],
  ["2026-10-30", "1 day"],
  ["2026-10-28", "1 day ago"],
])("uses the planning calendar for the %s countdown", (date, label) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-28T18:45:00Z"));
  const plan = createPlan({ ...exampleInput(), date });
  render(
    <OverviewTab plan={plan} readOnly onChange={vi.fn()} onTab={vi.fn()} />,
  );
  expect(screen.getByText(label, { exact: true })).toBeInTheDocument();
});
