// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import NewPlan from "@/app/plan/new/page";
import { usePlanStore } from "@/lib/store";

const navigation = vi.hoisted(() => ({
  params: new URLSearchParams("type=wedding"),
  push: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => navigation.params,
  useRouter: () => ({ push: navigation.push }),
}));

beforeEach(() => {
  usePlanStore.setState({
    plans: [],
    currentPlanId: undefined,
    history: { past: [], future: [] },
  });
  localStorage.clear();
  navigation.params = new URLSearchParams("type=wedding");
  navigation.push.mockReset();
});

it("creates a plan from edited community details and persists the matching enhancement request", async () => {
  navigation.params = new URLSearchParams("type=community");
  render(<NewPlan />);
  const edit = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  const advance = async (heading: string) => {
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { name: heading });
  };
  edit("Give your celebration a name", "Community garden fundraiser");
  edit("City", "Bristol");
  edit("Country", "United Kingdom");
  edit("Planning horizon in weeks", "8");
  edit("Setting", "outdoor");
  await advance("People & budget");
  edit("Number of guests", "50");
  edit("Currency", "GBP");
  edit("Total budget", "2000");
  edit("Budget flexibility", "strict");
  edit("kids", "10");
  edit("adults", "40");
  await advance("Your style");
  fireEvent.click(screen.getByRole("button", { name: "modern" }));
  fireEvent.click(screen.getByRole("button", { name: "fun" }));
  fireEvent.click(screen.getByRole("button", { name: "no-alcohol" }));
  fireEvent.click(screen.getByRole("button", { name: /3\. decor/ }));
  fireEvent.click(screen.getByRole("button", { name: "activities" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Move activities priority up" }),
  );
  edit("Traditions, stories or cultural details", "A welcome in two languages");
  edit("Must-haves, comma separated", "Quiet room,Ramp access");
  edit("Things to avoid", "fireworks");
  await advance("The details");
  edit("What brings everyone together?", "fundraiser");
  edit("Volunteers available", "12");
  fireEvent.click(
    screen.getByLabelText("We need local permissions or permits"),
  );
  fireEvent.click(screen.getByLabelText("This is a ticketed event"));
  await advance("Ready, set, celebrate");
  fireEvent.click(
    screen.getByRole("button", { name: "Create my celebration" }),
  );
  await waitFor(() => expect(usePlanStore.getState().plans).toHaveLength(1));
  const plan = usePlanStore.getState().plans[0];
  const expected = {
    eventType: "community",
    title: "Community garden fundraiser",
    planningWeeks: 8,
    location: {
      city: "Bristol",
      country: "United Kingdom",
      indoorOutdoor: "outdoor",
    },
    guestCount: 50,
    currency: "GBP",
    totalBudget: 2000,
    budgetFlexibility: "strict",
    ageGroups: { kids: 10, teens: 0, adults: 40, seniors: 0 },
    vibe: ["elegant", "fun"],
    dietary: ["vegetarian", "no-alcohol"],
    priorities: ["catering", "activities", "venue"],
    culturalNotes: "A welcome in two languages",
    mustHaves: ["Quiet room", "Ramp access"],
    avoid: ["fireworks"],
    eventSpecific: {
      type: "community",
      purpose: "fundraiser",
      volunteersAvailable: 12,
      permitsNeeded: true,
      ticketed: true,
    },
  };
  expect(plan.input).toMatchObject(expected);
  expect(
    JSON.parse(localStorage.getItem(`celebrate-enhance-${plan.id}`) || "null"),
  ).toMatchObject(expected);
  expect(localStorage.getItem("celebrate-draft")).toBeNull();
});
afterEach(cleanup);

it("announces exactly one chosen occasion and keeps the choice when revisiting the step", async () => {
  render(<NewPlan />);
  expect(
    screen.getByRole("button", { name: "wedding", pressed: true }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "birthday" }));
  expect(
    screen.getByRole("button", { name: "birthday", pressed: true }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "wedding", pressed: false }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Community", pressed: false }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByLabelText("Number of guests");
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(
    screen.getByRole("button", { name: "birthday", pressed: true }),
  ).toBeInTheDocument();
});

it("moves focus to the current step heading after forward and back navigation", async () => {
  render(<NewPlan />);
  expect(
    screen.getByRole("button", { name: /The occasion/, current: "step" }),
  ).toBeInTheDocument();
  const title = screen.getByLabelText("Give your celebration a name");
  title.focus();
  fireEvent.change(title, { target: { value: "Our birthday picnic" } });
  expect(title).toHaveFocus();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "People & budget" }),
    ).toHaveFocus(),
  );
  expect(
    screen.getByRole("button", { name: /People & budget/, current: "step" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "The occasion" })).toHaveFocus(),
  );
  expect(screen.getByLabelText("Give your celebration a name")).toHaveValue(
    "Our birthday picnic",
  );
});

it("focuses the requested section when editing from the review", async () => {
  render(<NewPlan />);
  for (const name of [
    "People & budget",
    "Your style",
    "The details",
    "Ready, set, celebrate",
  ]) {
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name })).toHaveFocus(),
    );
  }
  fireEvent.click(screen.getByRole("button", { name: "Edit your style" }));
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Your style" })).toHaveFocus(),
  );
  expect(
    screen.getByRole("button", { name: /Your style/, current: "step" }),
  ).toBeInTheDocument();
});
