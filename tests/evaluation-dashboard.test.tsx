// @vitest-environment jsdom
import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { EvaluationDashboard } from "@/components/evals/EvaluationDashboard";
import { EvaluationSummarySchema } from "@/lib/schemas/evaluation";
import snapshot from "@/evals/results/latest.summary.json";
import baseline from "@/evals/results/v1.summary.json";

const initial = EvaluationSummarySchema.parse({
  ...snapshot,
  results: [snapshot.results[0]],
});
const previous = EvaluationSummarySchema.parse(baseline);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function toggle(summary: HTMLElement, open = true) {
  const details = summary.closest("details")!;
  details.open = open;
  fireEvent(details, new Event("toggle"));
}

async function openEvidence() {
  toggle(screen.getByText(new RegExp(initial.results[0].id)));
  toggle(await screen.findByText("Input / output JSON"));
}

it("shows the new run's output after a case with the same ID was already opened", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        Response.json({ output: { marker: "OLD STATIC OUTPUT" } }),
      ),
  );
  render(<EvaluationDashboard initial={initial} baseline={previous} />);
  await openEvidence();
  await screen.findByText(/OLD STATIC OUTPUT/);
  act(() =>
    window.dispatchEvent(
      new CustomEvent("celebrate-eval", {
        detail: {
          ...initial,
          id: "new-live-run",
          results: [
            { ...initial.results[0], output: { marker: "NEW LIVE OUTPUT" } },
          ],
        },
      }),
    ),
  );
  await openEvidence();
  expect(await screen.findByText(/NEW LIVE OUTPUT/)).toBeVisible();
  expect(screen.queryByText(/OLD STATIC OUTPUT/)).not.toBeInTheDocument();
});

it("does not substitute historical static evidence for a live case that produced no output", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      Response.json({ output: { marker: "UNRELATED STATIC OUTPUT" } }),
    );
  vi.stubGlobal("fetch", fetch);
  render(<EvaluationDashboard initial={initial} baseline={previous} />);
  act(() =>
    window.dispatchEvent(
      new CustomEvent("celebrate-eval", {
        detail: {
          ...initial,
          id: "failed-live-run",
          results: [
            {
              ...initial.results[0],
              passed: false,
              error: "Provider request failed",
            },
          ],
        },
      }),
    ),
  );
  await openEvidence();
  expect(await screen.findByText(/did not produce output/)).toBeVisible();
  expect(screen.getByText("Provider request failed")).toBeVisible();
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.queryByText(/UNRELATED STATIC OUTPUT/)).not.toBeInTheDocument();
});

it("cancels an obsolete snapshot load when a newer live run arrives", async () => {
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
  render(<EvaluationDashboard initial={initial} baseline={previous} />);
  await openEvidence();
  await screen.findByText("Loading case evidence…");
  act(() =>
    window.dispatchEvent(
      new CustomEvent("celebrate-eval", {
        detail: {
          ...initial,
          id: "newer-live-run",
          results: [
            { ...initial.results[0], output: { marker: "CURRENT OUTPUT" } },
          ],
        },
      }),
    ),
  );
  await openEvidence();
  await act(async () =>
    resolve(Response.json({ output: { marker: "STALE RESPONSE" } })),
  );
  expect(signal?.aborted).toBe(true);
  expect(await screen.findByText(/CURRENT OUTPUT/)).toBeVisible();
  expect(screen.queryByText(/STALE RESPONSE/)).not.toBeInTheDocument();
});

it("allows retrying unavailable static evidence without replacing the run", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }))
      .mockResolvedValueOnce(
        Response.json({ output: { marker: "RECOVERED OUTPUT" } }),
      ),
  );
  render(<EvaluationDashboard initial={initial} baseline={previous} />);
  await openEvidence();
  expect(await screen.findByRole("alert")).toHaveTextContent(/reopen to retry/);
  const summary = screen.getByText("Input / output JSON");
  toggle(summary, false);
  await waitFor(() =>
    expect(
      screen.queryByText("Loading case evidence…"),
    ).not.toBeInTheDocument(),
  );
  toggle(summary);
  expect(await screen.findByText(/RECOVERED OUTPUT/)).toBeVisible();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
