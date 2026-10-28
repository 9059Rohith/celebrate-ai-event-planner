// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Feedback } from "@/components/planner/Feedback";
import { renderToString } from "react-dom/server";

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("exposes the selected reason to assistive technology", () => {
  render(<Feedback planId="plan-one" section="overview" />);
  fireEvent.click(screen.getByRole("button", { name: "Helpful" }));
  fireEvent.click(screen.getByRole("button", { name: "Budget fit" }));
  expect(
    screen
      .getByRole("button", { name: "Budget fit" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  expect(
    screen
      .getByRole("button", { name: "Useful detail" })
      .getAttribute("aria-pressed"),
  ).toBe("false");
});

it("keeps feedback scoped to its plan and section and restores saved ratings", () => {
  const { rerender } = render(
    <Feedback planId="plan-one" section="overview" />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Helpful" }));
  fireEvent.click(screen.getByRole("button", { name: "Budget fit" }));
  rerender(<Feedback planId="plan-one" section="budget" />);
  expect(
    screen
      .getByRole("button", { name: "Helpful" })
      .getAttribute("aria-pressed"),
  ).toBe("false");
  expect(screen.queryByRole("button", { name: "Budget fit" })).toBeNull();
  rerender(<Feedback planId="plan-one" section="overview" />);
  expect(
    screen
      .getByRole("button", { name: "Helpful" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  expect(
    screen
      .getByRole("button", { name: "Budget fit" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  rerender(<Feedback planId="plan-two" section="overview" />);
  expect(
    screen
      .getByRole("button", { name: "Helpful" })
      .getAttribute("aria-pressed"),
  ).toBe("false");
});

it("does not claim feedback was saved when storage rejects the write", () => {
  render(<Feedback planId="plan-one" section="overview" />);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Quota", "QuotaExceededError");
  });
  fireEvent.click(screen.getByRole("button", { name: "Helpful" }));
  expect(screen.queryByText("Thank you — saved on this device.")).toBeNull();
  expect(screen.getByRole("status").textContent).toMatch(/could not be saved/i);
});

it("uses the empty server snapshot before reading saved feedback on the client", () => {
  localStorage.setItem(
    "celebrate-feedback",
    JSON.stringify([
      {
        planId: "plan-one",
        section: "overview",
        rating: "up",
        reason: "Budget fit",
      },
    ]),
  );
  expect(
    renderToString(<Feedback planId="plan-one" section="overview" />),
  ).not.toContain('aria-pressed="true"');
  render(<Feedback planId="plan-one" section="overview" />);
  expect(
    screen
      .getByRole("button", { name: "Helpful" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
});
