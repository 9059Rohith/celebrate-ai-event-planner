// @vitest-environment jsdom
import React, { Suspense } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import PlanPage from "@/app/plan/[id]/page";
import { createPlan, exampleInput } from "@/lib/domain/planner";
import { usePlanStore } from "@/lib/store";
import type { Plan } from "@/lib/schemas";

const navigation = vi.hoisted(() => ({
  params: new URLSearchParams(),
  push: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => navigation.params,
  useRouter: () => ({ push: navigation.push }),
}));

beforeEach(() => {
  localStorage.clear();
  usePlanStore.setState({
    plans: [],
    currentPlanId: null,
    history: { past: [], future: [] },
  });
  navigation.params = new URLSearchParams();
  history.replaceState(null, "", "/");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function editedPlan() {
  const plan: Plan = JSON.parse(JSON.stringify(createPlan(exampleInput())));
  plan.version = 7;
  plan.summary.headline = "My saved headline";
  plan.summary.oneParagraphVision = "My custom saved vision";
  plan.budget.lines[0].locked = true;
  plan.timeline.milestones[0].status = "done";
  plan.timeline.milestones[1].notes =
    "Preserve my multiline operational note.\n".repeat(20);
  plan.timeline.dayOf[0].owner = "Venue lead";
  plan.vendors[0].status = "confirmed";
  plan.vendors[0].checklist[0].done = true;
  plan.ideas[0].saved = true;
  return plan;
}
function enhancement(plan: Plan) {
  return {
    summary: {
      oneParagraphVision: "A new AI vision",
      assumptionsToAdd: ["A new planning assumption"],
    },
    sections: [
      {
        section: "budget",
        changes: [
          { id: plan.budget.lines[0].id, notes: "Request a written estimate." },
        ],
      },
      {
        section: "timeline",
        changes: [
          {
            id: plan.timeline.milestones[0].id,
            notes: "Confirm the accessible entrance.",
          },
        ],
      },
      {
        section: "vendors",
        changes: [
          {
            id: plan.vendors[0].id,
            questionsToAdd: ["Is a quiet room available?"],
          },
        ],
      },
      {
        section: "ideas",
        changes: [{ id: plan.ideas[0].id, title: "An updated idea" }],
      },
    ],
    meta: { source: "hybrid", promptVersion: "2026-10-v2" },
  };
}
async function open(plan: Plan, automatic = false) {
  usePlanStore.getState().addPlan(plan);
  if (automatic) {
    navigation.params = new URLSearchParams("generating=1");
    localStorage.setItem(
      `celebrate-enhance-${plan.id}`,
      JSON.stringify(plan.input),
    );
  }
  let view!: ReturnType<typeof render>;
  await act(async () => {
    view = render(
      <Suspense fallback={<p>Opening</p>}>
        <PlanPage params={Promise.resolve({ id: plan.id })} />
      </Suspense>,
    );
  });
  if (!automatic) await screen.findByRole("button", { name: "Retry with AI" });
  return view;
}
const current = () => usePlanStore.getState().plans[0];

it("previews saved-plan AI details without changing progress, then commits once with undo", async () => {
  const plan = editedPlan();
  const fetch = vi.fn().mockResolvedValue(Response.json(enhancement(plan)));
  vi.stubGlobal("fetch", fetch);
  await open(plan);
  fireEvent.click(screen.getByRole("button", { name: "Retry with AI" }));
  const accept = await screen.findByRole("button", {
    name: "Accept AI details",
  });
  expect(current()).toEqual(plan);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
    mode: "refine",
    plan: { snapshot: true },
  });
  fireEvent.click(accept);
  expect(current().summary.headline).toBe("My saved headline");
  expect(current().summary.oneParagraphVision).toBe("A new AI vision");
  expect(current().budget.lines[0].locked).toBe(true);
  expect(current().budget.lines[0].allocatedAmount).toBe(
    plan.budget.lines[0].allocatedAmount,
  );
  expect(current().timeline.milestones[0].status).toBe("done");
  expect(current().timeline.milestones[1]).toEqual(plan.timeline.milestones[1]);
  expect(current().timeline.dayOf).toEqual(plan.timeline.dayOf);
  expect(current().vendors[0].status).toBe("confirmed");
  expect(current().vendors[0].checklist).toEqual(plan.vendors[0].checklist);
  expect(current().vendors[0].questionsToAsk).toContain(
    "Is a quiet room available?",
  );
  expect(current().ideas[0]).toMatchObject({
    title: "An updated idea",
    saved: true,
  });
  expect(usePlanStore.getState().history.past).toEqual([plan]);
  expect(current().version).toBe(plan.version + 1);
  fireEvent.click(
    screen.getByRole("button", { name: "Undo last plan change" }),
  );
  expect(current()).toMatchObject({
    ...plan,
    version: plan.version + 2,
    updatedAt: expect.any(String),
  });
});

it("rejects a preview after a newer edit without partially applying any section", async () => {
  const plan = editedPlan();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json(enhancement(plan))),
  );
  await open(plan);
  fireEvent.click(screen.getByRole("button", { name: "Retry with AI" }));
  const accept = await screen.findByRole("button", {
    name: "Accept AI details",
  });
  act(() =>
    usePlanStore.getState().updatePlan(plan.id, {
      summary: { ...plan.summary, headline: "Newer edit" },
    }),
  );
  const latest = current();
  fireEvent.click(accept);
  expect(screen.getByRole("alert")).toHaveTextContent(/changed/);
  expect(current()).toEqual(latest);
  expect(usePlanStore.getState().history.past).toEqual([]);
});

it("rejects invalid later section patches without publishing earlier valid changes", async () => {
  const plan = editedPlan();
  const invalid = enhancement(plan);
  invalid.sections[3].changes[0].id = "unknown-idea";
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(invalid)));
  await open(plan);
  fireEvent.click(screen.getByRole("button", { name: "Retry with AI" }));
  await screen.findByRole("alert");
  expect(current()).toEqual(plan);
  expect(
    screen.queryByRole("button", { name: "Accept AI details" }),
  ).not.toBeInTheDocument();
  expect(usePlanStore.getState().history.past).toEqual([]);
});

it("keeps a custom imported summary and all saved edits when retry falls back", async () => {
  const plan = editedPlan();
  const fallback = {
    summary: {},
    sections: ["budget", "timeline", "vendors", "ideas"].map((section) => ({
      section,
      changes: [],
    })),
    meta: { source: "fallback", promptVersion: "2026-10-v2" },
  };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(fallback)));
  await open(plan);
  fireEvent.click(screen.getByRole("button", { name: "Retry with AI" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    /saved plan.*not changed/,
  );
  expect(current()).toEqual(plan);
  expect(usePlanStore.getState().history.past).toEqual([]);
});

it("routes a pending creation request through preview if the plan was already edited", async () => {
  const plan = editedPlan();
  const fetch = vi.fn().mockResolvedValue(Response.json(enhancement(plan)));
  vi.stubGlobal("fetch", fetch);
  await open(plan, true);
  await screen.findByRole("button", { name: "Accept AI details" });
  expect(current()).toEqual(plan);
  expect(JSON.parse(fetch.mock.calls[0][1].body).mode).toBe("refine");
});

it("still applies initial automatic generation to a pristine newly created plan", async () => {
  const plan = createPlan(exampleInput());
  const enhanced = structuredClone(plan);
  enhanced.summary.oneParagraphVision = "Fresh automatic AI vision";
  enhanced.meta.source = "hybrid";
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(`event: complete\ndata: ${JSON.stringify(enhanced)}\n\n`, {
        headers: { "Content-Type": "text/event-stream" },
      }),
    ),
  );
  await open(plan, true);
  await waitFor(() =>
    expect(current().summary.oneParagraphVision).toBe(
      "Fresh automatic AI vision",
    ),
  );
  expect(current().meta.source).toBe("hybrid");
  expect(
    screen.queryByRole("button", { name: "Accept AI details" }),
  ).not.toBeInTheDocument();
  expect(localStorage.getItem(`celebrate-enhance-${plan.id}`)).toBeNull();
});

it("does not publish a late response or metadata after the saved-plan owner is left", async () => {
  const plan = editedPlan();
  let resolve!: (response: Response) => void;
  let signal: AbortSignal | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn((_url, options) => {
      signal = options?.signal;
      return new Promise<Response>((done) => {
        resolve = done;
      });
    }),
  );
  const view = await open(plan);
  fireEvent.click(screen.getByRole("button", { name: "Retry with AI" }));
  view.unmount();
  await act(async () => resolve(Response.json(enhancement(plan))));
  expect(signal?.aborted).toBe(true);
  expect(current()).toEqual(plan);
  expect(usePlanStore.getState().history.past).toEqual([]);
});

it("does not overwrite edits or metadata made while initial generation is streaming", async () => {
  const plan = createPlan(exampleInput());
  let stream!: ReadableStreamDefaultController<Uint8Array>;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            stream = controller;
          },
        }),
      ),
    ),
  );
  await open(plan, true);
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      /Adding personalized AI details/,
    ),
  );
  act(() =>
    usePlanStore.getState().updatePlan(plan.id, {
      summary: { ...plan.summary, headline: "My newer title" },
    }),
  );
  const latest = current();
  await act(async () => {
    const enhanced = { ...plan, meta: { ...plan.meta, source: "hybrid" } };
    stream.enqueue(
      new TextEncoder().encode(
        `event: complete\ndata: ${JSON.stringify(enhanced)}\n\n`,
      ),
    );
    stream.close();
  });
  expect(current()).toEqual(latest);
});
