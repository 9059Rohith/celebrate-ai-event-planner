// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { IdeasTab } from "@/components/planner/IdeasTab";
import { createPlan, exampleInput } from "@/lib/domain/planner";
import { WizardStyle } from "@/components/wizard/WizardStyle";
import { WizardDetails } from "@/components/wizard/WizardDetails";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("removes duplicate titles and IDs within an ideas response and existing cards", async () => {
  const plan = createPlan(exampleInput());
  const idea = { ...plan.ideas[0], id: "fresh-id", title: "New unique idea" };
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            source: "fallback",
            ideas: [
              idea,
              { ...idea, id: "duplicate-title", title: " NEW UNIQUE IDEA " },
              { ...idea, title: "Different title, same ID" },
              { ...idea, id: plan.ideas[0].id, title: "Existing ID" },
            ],
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
    ),
  );
  const change = vi.fn();
  render(
    <IdeasTab
      plan={plan}
      readOnly={false}
      onChange={change}
      onNotice={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Surprise me" }));
  await waitFor(() => expect(change).toHaveBeenCalledOnce());
  expect(change.mock.calls[0][0].ideas).toEqual([...plan.ideas, idea]);
});

it("exposes selected kind filters to assistive technology", () => {
  const plan = createPlan(exampleInput());
  render(
    <IdeasTab
      plan={plan}
      readOnly={false}
      onChange={vi.fn()}
      onNotice={vi.fn()}
    />,
  );
  expect(
    screen.getByRole("button", { name: "all", pressed: true }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "saved" }));
  expect(
    screen.getByRole("button", { name: "saved", pressed: true }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "all", pressed: false }),
  ).toBeInTheDocument();
});

it("exposes wizard preference and wedding function toggle states", () => {
  const input = exampleInput();
  const first = render(
    <WizardStyle input={input} patch={vi.fn()} setStep={vi.fn()} />,
  );
  for (const name of ["modern", "vegetarian"]) {
    const selected =
      name === "modern"
        ? input.vibe.includes("modern")
        : input.dietary.includes("vegetarian");
    expect(
      screen.getByRole("button", { name, pressed: selected }),
    ).toBeInTheDocument();
  }
  expect(
    screen.getByRole("button", {
      name: /catering$/,
      pressed: input.priorities.includes("catering"),
    }),
  ).toBeInTheDocument();
  first.unmount();
  render(<WizardDetails input={input} patch={vi.fn()} setStep={vi.fn()} />);
  expect(
    screen.getByRole("button", { name: "ceremony", pressed: true }),
  ).toBeInTheDocument();
});
