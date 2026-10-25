// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { createPlan, exampleInput } from "@/lib/domain/planner";
import { usePlanStore } from "@/lib/store";
import { usePlanActions } from "@/lib/hooks/usePlanActions";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
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
  push.mockClear();
});

describe("workspace plan actions", () => {
  function setup(readOnly = false) {
    const plan = createPlan(exampleInput());
    usePlanStore.getState().addPlan(plan);
    const notice = vi.fn();
    const hook = renderHook(() => usePlanActions(plan, readOnly, notice));
    return { plan, notice, ...hook };
  }
  it("merges edits with the latest stored plan and records reversible history", () => {
    const { plan, result } = setup();
    act(() =>
      usePlanStore.getState().updatePlan(plan.id, {
        summary: { ...plan.summary, headline: "Latest title" },
      }),
    );
    act(() =>
      result.current.change({ input: { ...plan.input, guestCount: 123 } }),
    );
    expect(usePlanStore.getState().getCurrentPlan()?.summary.headline).toBe(
      "Latest title",
    );
    expect(usePlanStore.getState().getCurrentPlan()?.input.guestCount).toBe(
      123,
    );
    act(() => {
      result.current.undo();
    });
    expect(usePlanStore.getState().getCurrentPlan()?.input.guestCount).toBe(
      plan.input.guestCount,
    );
    act(() => {
      result.current.redo();
    });
    expect(usePlanStore.getState().getCurrentPlan()?.input.guestCount).toBe(
      123,
    );
  });
  it("rejects invalid edits without overwriting the original", () => {
    const { plan, result, notice } = setup();
    act(() =>
      result.current.change({ input: { ...plan.input, guestCount: -1 } }),
    );
    expect(usePlanStore.getState().getCurrentPlan()).toEqual(plan);
    expect(notice).toHaveBeenCalledWith(
      expect.stringContaining("could not be validated"),
    );
  });
  it("protects read-only plans while allowing import as a new local copy", () => {
    const { plan, result } = setup(true);
    act(() => {
      result.current.change({
        summary: { ...plan.summary, headline: "Blocked" },
      });
      result.current.duplicatePlan();
      result.current.deletePlan();
    });
    expect(usePlanStore.getState().plans).toEqual([plan]);
    act(() => result.current.importCopy());
    expect(usePlanStore.getState().plans).toHaveLength(2);
    expect(usePlanStore.getState().getCurrentPlan()?.id).not.toBe(plan.id);
    expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/plan\//));
  });
  it("duplicates and deletes only after confirmation", () => {
    const { result } = setup();
    act(() => result.current.duplicatePlan());
    expect(usePlanStore.getState().plans).toHaveLength(2);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    act(() => result.current.deletePlan());
    expect(usePlanStore.getState().plans).toHaveLength(2);
    vi.mocked(window.confirm).mockReturnValue(true);
    act(() => result.current.deletePlan());
    expect(usePlanStore.getState().plans).toHaveLength(1);
    expect(push).toHaveBeenLastCalledWith("/");
  });
  it("provides a share URL when clipboard access is denied", async () => {
    const { result, notice } = setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) },
    });
    await act(async () => result.current.share());
    expect(notice).toHaveBeenCalledWith(expect.stringContaining("/shared#"));
    vi.mocked(navigator.clipboard.writeText).mockResolvedValue();
    await act(async () => result.current.share());
    expect(notice).toHaveBeenLastCalledWith(
      expect.stringContaining("share link copied"),
    );
  });
});
