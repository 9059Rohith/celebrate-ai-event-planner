import { migratePlans } from "@/lib/client/planStorage";
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import LZString from "lz-string";
import { createPlan, exampleInput } from "@/lib/domain/planner";
import { decodePlan, encodePlan, getShareUrl } from "@/lib/share";
import { safeStorage, storageError, writeLocal } from "@/lib/client/storage";
import { usePlanStore, useUIStore } from "@/lib/store";
import { usePlannerChat } from "@/lib/hooks/usePlannerChat";
import { EvaluationSummarySchema } from "@/lib/schemas/evaluation";
import snapshot from "@/evals/results/latest.summary.json";
import baseline from "@/evals/results/v1.summary.json";

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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("shared plan boundaries", () => {
  it("round-trips editable details and keeps payloads in the URL fragment", () => {
    const plan = createPlan(exampleInput());
    plan.timeline.milestones[0].notes =
      "Keep the entrance wheelchair accessible";
    const url = new URL(getShareUrl(plan, "https://example.test")!);
    expect(url.pathname).toBe("/shared");
    expect(url.search).toBe("");
    // JSON normalizes negative zero; compare the serialized plan contract.
    expect(decodePlan(url.hash.slice(1))).toEqual(
      JSON.parse(JSON.stringify(plan)),
    );
  });
  it.each(["not json", "null", '{"id":"bad","summary":{},"budget":{}}'])(
    "rejects malformed or invalid decoded data: %s",
    (value) => {
      expect(
        decodePlan(LZString.compressToEncodedURIComponent(value)),
      ).toBeNull();
    },
  );
  it("rejects a highly compressed payload that expands beyond the limit", () => {
    const encoded = LZString.compressToEncodedURIComponent("x".repeat(262145));
    expect(encoded.length).toBeLessThan(65536);
    expect(decodePlan(encoded)).toBeNull();
  });
  it("returns no share URL for oversized plans", () => {
    const plan = createPlan(exampleInput());
    plan.summary.headline = "x".repeat(262145);
    expect(encodePlan(plan)).toBeNull();
    expect(getShareUrl(plan)).toBeNull();
  });
});

describe("storage recovery and history", () => {
  it("reports quota failures while preserving in-memory UI settings", () => {
    const notify = vi.fn();
    window.addEventListener("celebrate-storage-error", notify);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota", "QuotaExceededError");
    });
    try {
      expect(writeLocal("test", "value")).toBe(false);
      useUIStore.getState().setCurrency("EUR");
      expect(useUIStore.getState().currency).toBe("EUR");
      expect(notify).toHaveBeenCalledTimes(2);
      expect(storageError()).toContain("export JSON");
    } finally {
      window.removeEventListener("celebrate-storage-error", notify);
    }
  });
  it("reads and removes stored values and rejects dangling current IDs", () => {
    safeStorage.setItem("test", "value");
    expect(safeStorage.getItem("test")).toBe("value");
    safeStorage.removeItem("test");
    expect(safeStorage.getItem("test")).toBeNull();
    expect(
      migratePlans({
        plans: [createPlan(exampleInput())],
        currentPlanId: "missing",
      }).currentPlanId,
    ).toBeNull();
  });
  it("duplicates nested data independently and deletes only the selected plan", () => {
    const plan = createPlan(exampleInput());
    const store = usePlanStore.getState();
    store.addPlan(plan);
    const copy = store.duplicatePlan(plan.id)!;
    copy.vendors[0].checklist[0].text = "Copy only";
    expect(plan.vendors[0].checklist[0].text).not.toBe("Copy only");
    expect(copy.version).toBe(1);
    expect(copy.summary.headline).toContain("(Copy)");
    store.deletePlan(copy.id);
    expect(usePlanStore.getState().getCurrentPlan()?.id).toBe(plan.id);
    store.deletePlan(plan.id);
    expect(usePlanStore.getState().currentPlanId).toBeNull();
    expect(store.duplicatePlan("missing")).toBeNull();
  });
  it("bounds undo history and invalidates redo after a new edit", () => {
    const plan = createPlan(exampleInput());
    const store = usePlanStore.getState();
    store.addPlan(plan);
    for (let i = 0; i < 25; i++) store.pushHistory(plan);
    expect(usePlanStore.getState().history.past).toHaveLength(20);
    store.updatePlan(plan.id, {
      summary: { ...plan.summary, headline: "Edited" },
    });
    expect(store.canUndo()).toBe(true);
    expect(store.undo()?.summary.headline).toBe(plan.summary.headline);
    expect(store.canRedo()).toBe(true);
    expect(store.redo()?.summary.headline).toBe("Edited");
    store.undo();
    store.pushHistory(plan);
    expect(store.canRedo()).toBe(false);
    expect(store.redo()).toBeNull();
  });
});

describe("evaluation summary contract", () => {
  it("accepts published snapshots without pretending they are full runs", () => {
    expect(EvaluationSummarySchema.safeParse(snapshot).success).toBe(true);
    expect(EvaluationSummarySchema.safeParse(baseline).success).toBe(true);
  });
  it.each([
    { results: [{}] },
    { timestamp: "invalid" },
    { metricRates: { schema: 2 } },
  ])("rejects corrupted evaluation events: %j", (invalid) => {
    expect(
      EvaluationSummarySchema.safeParse({ ...snapshot, ...invalid }).success,
    ).toBe(false);
  });
});

describe("chat lifecycle", () => {
  const options = () => ({
    plan: createPlan(exampleInput()),
    readOnly: false,
    onChange: vi.fn(),
    onNotice: vi.fn(),
  });
  it("recovers decisions independently of corrupt message storage and resets on plan switches", async () => {
    const props = options();
    localStorage.setItem(`celebrate-chat-${props.plan.id}`, "broken json");
    localStorage.setItem(
      `celebrate-chat-${props.plan.id}-decisions`,
      JSON.stringify({ proposal: { status: "accepted", appliedVersion: 2 } }),
    );
    const { result, rerender } = renderHook(usePlannerChat, {
      initialProps: props,
    });
    await waitFor(() =>
      expect(result.current.decisions.proposal?.status).toBe("accepted"),
    );
    expect(result.current.messages).toEqual([]);
    act(() => result.current.setText("Previous draft"));
    rerender(options());
    await waitFor(() => expect(result.current.decisions).toEqual({}));
    expect(result.current.text).toBe("");
  });
  it("persists a completed stream once rather than writing every token", async () => {
    const { result } = renderHook(usePlannerChat, { initialProps: options() });
    await act(async () => {});
    const writes = vi.spyOn(Storage.prototype, "setItem");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            'event: token\ndata: {"text":"Hello"}\n\nevent: token\ndata: {"text":" there"}\n\nevent: complete\ndata: {"answer":"Hello there"}\n\n',
          ),
        ),
    );
    await act(async () => {
      await result.current.send("Help");
    });
    expect(result.current.messages.at(-1)?.text).toBe("Hello there");
    expect(result.current.busy).toBe(false);
    expect(writes).toHaveBeenCalledTimes(2);
  });
  it("aborts an active request on unmount", async () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            signal = init.signal ?? undefined;
            signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          }),
      ),
    );
    const { result, unmount } = renderHook(usePlannerChat, {
      initialProps: options(),
    });
    await act(async () => {});
    let pending: Promise<void>;
    act(() => {
      pending = result.current.send("Help");
    });
    unmount();
    await pending!;
    expect(signal?.aborted).toBe(true);
  });
});
