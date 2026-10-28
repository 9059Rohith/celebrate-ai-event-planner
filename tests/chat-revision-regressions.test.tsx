// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { createPlan, exampleInput } from "@/lib/domain/planner";
import { usePlanStore } from "@/lib/store";
import { usePlanActions } from "@/lib/hooks/usePlanActions";
import { usePlannerChat } from "@/lib/hooks/usePlannerChat";
import type { Plan } from "@/lib/schemas";
import type { ToolProposal } from "@/lib/llm/tools";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const regeneration: ToolProposal = {
  id: "regenerate-ideas",
  name: "regenerate_section",
  arguments: { section: "ideas", instructions: "Fresh ideas" },
};
const guestProposal: ToolProposal = {
  id: "guest-change",
  name: "set_guest_count",
  arguments: { value: 100 },
};
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
  vi.unstubAllGlobals();
});
async function setup() {
  const plan = createPlan(exampleInput());
  usePlanStore.getState().addPlan(plan);
  const notice = vi.fn();
  const hook = renderHook(() => {
    const current =
      usePlanStore((s) => s.plans.find((p) => p.id === plan.id)) || plan;
    const actions = usePlanActions(current, false, notice);
    const chat = usePlannerChat({
      plan: current,
      readOnly: false,
      onChange: actions.change,
      onNotice: notice,
    });
    return { chat, actions };
  });
  await act(async () => {});
  return { ...hook, plan, notice };
}
function deferIdeas(plan: Plan) {
  let resolve!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    () =>
      new Promise<Response>((done) => {
        resolve = done;
      }),
  );
  const ideas = [
    { ...plan.ideas[0], id: "regenerated-idea", title: "Fresh idea" },
  ];
  return () => resolve(Response.json({ value: ideas }));
}

describe("chat proposal lifecycle and revision safety", () => {
  it("keeps a pending proposal dismissed when regeneration completes", async () => {
    const { plan, result } = await setup();
    const resolve = deferIdeas(plan);
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.chat.accept(regeneration);
    });
    act(() => {
      result.current.chat.decide({
        [regeneration.id]: { status: "dismissed" },
      });
    });
    await act(async () => {
      resolve();
      await pending;
    });
    expect(usePlanStore.getState().plans[0]).toEqual(plan);
    expect(usePlanStore.getState().history.past).toEqual([]);
    expect(result.current.chat.decisions[regeneration.id].status).toBe(
      "dismissed",
    );
    expect(
      JSON.parse(localStorage.getItem(`celebrate-chat-${plan.id}-decisions`)!)[
        regeneration.id
      ].status,
    ).toBe("dismissed");
  });

  it("preserves other proposal decisions made while regeneration is pending", async () => {
    const { plan, result } = await setup();
    const resolve = deferIdeas(plan);
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.chat.accept(regeneration);
    });
    act(() => {
      result.current.chat.decide({
        [guestProposal.id]: { status: "dismissed" },
      });
    });
    await act(async () => {
      resolve();
      await pending;
    });
    expect(usePlanStore.getState().plans[0].ideas[0].title).toBe("Fresh idea");
    expect(result.current.chat.decisions[regeneration.id].status).toBe(
      "accepted",
    );
    expect(result.current.chat.decisions[guestProposal.id]?.status).toBe(
      "dismissed",
    );
    expect(
      JSON.parse(localStorage.getItem(`celebrate-chat-${plan.id}-decisions`)!)[
        guestProposal.id
      ]?.status,
    ).toBe("dismissed");
  });

  it("ignores a regeneration response after its chat unmounts", async () => {
    const { plan, result, unmount } = await setup();
    const resolve = deferIdeas(plan);
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.chat.accept(regeneration);
    });
    unmount();
    await act(async () => {
      resolve();
      await pending;
    });
    expect(usePlanStore.getState().plans[0]).toEqual(plan);
    expect(usePlanStore.getState().history.past).toEqual([]);
    expect(
      localStorage.getItem(`celebrate-chat-${plan.id}-decisions`),
    ).toBeNull();
  });

  it("keeps another plan's edits and history intact after an old request finishes", async () => {
    const { plan, result } = await setup();
    const resolve = deferIdeas(plan);
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.chat.accept(regeneration);
    });
    const other = createPlan(exampleInput("birthday"));
    act(() => {
      const store = usePlanStore.getState();
      store.addPlan(other);
      store.pushHistory(other);
      store.updatePlan(other.id, {
        summary: { ...other.summary, headline: "Keep my edit" },
      });
    });
    const before = usePlanStore.getState();
    await act(async () => {
      resolve();
      await pending;
    });
    expect(usePlanStore.getState().plans).toEqual(before.plans);
    expect(usePlanStore.getState().history).toEqual(before.history);
    act(() => {
      usePlanStore.getState().undo();
    });
    expect(usePlanStore.getState().getCurrentPlan()?.summary.headline).toBe(
      other.summary.headline,
    );
  });

  it("does not add phantom history through an action captured before deletion", async () => {
    const { plan, result } = await setup();
    const change = result.current.actions.change;
    act(() => {
      usePlanStore.getState().deletePlan(plan.id);
      change({ summary: { ...plan.summary, headline: "Too late" } });
    });
    expect(usePlanStore.getState().plans).toEqual([]);
    expect(usePlanStore.getState().history.past).toEqual([]);
  });

  it("does not undo an unrelated edit after global undo reused a proposal's version", async () => {
    const { plan, result } = await setup();
    await act(async () => {
      await result.current.chat.accept(guestProposal);
    });
    expect(usePlanStore.getState().getCurrentPlan()?.input.guestCount).toBe(
      100,
    );
    act(() => {
      result.current.actions.undo();
    });
    act(() => {
      result.current.actions.change({
        summary: { ...plan.summary, headline: "Keep unrelated edit" },
      });
    });
    act(() => {
      result.current.chat.undo(guestProposal);
    });
    expect(usePlanStore.getState().getCurrentPlan()?.summary.headline).toBe(
      "Keep unrelated edit",
    );
    expect(usePlanStore.getState().getCurrentPlan()?.input.guestCount).toBe(
      plan.input.guestCount,
    );
  });

  it("rejects regeneration after an edit and undo return to the original content", async () => {
    const { plan, result } = await setup();
    const resolve = deferIdeas(plan);
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.chat.accept(regeneration);
    });
    act(() => {
      result.current.actions.change({
        summary: { ...plan.summary, headline: "Intervening edit" },
      });
    });
    act(() => {
      result.current.actions.undo();
    });
    await act(async () => {
      resolve();
      await pending;
    });
    expect(usePlanStore.getState().getCurrentPlan()?.ideas).toEqual(plan.ideas);
    expect(result.current.chat.decisions[regeneration.id]).toBeUndefined();
  });

  it("keeps revisions increasing through undo and redo while restoring content", async () => {
    const { plan, result } = await setup();
    act(() => {
      result.current.actions.change({
        summary: { ...plan.summary, headline: "Redo this" },
      });
    });
    const editedVersion = usePlanStore.getState().getCurrentPlan()!.version;
    act(() => {
      result.current.actions.undo();
    });
    const undone = usePlanStore.getState().getCurrentPlan()!;
    expect(undone.summary.headline).toBe(plan.summary.headline);
    expect(undone.version).toBeGreaterThan(editedVersion);
    act(() => {
      result.current.actions.redo();
    });
    const redone = usePlanStore.getState().getCurrentPlan()!;
    expect(redone.summary.headline).toBe("Redo this");
    expect(redone.version).toBeGreaterThan(undone.version);
  });
});
