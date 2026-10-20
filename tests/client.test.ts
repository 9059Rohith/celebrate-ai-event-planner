import { describe, it, expect, vi, afterEach } from "vitest";
import { migratePlans, safeStorage } from "@/lib/client/storage";
import { createPlan, exampleInput } from "@/lib/domain/planner";
import { consumeSSE } from "@/lib/client/network";
import { compactPlanSnapshot, hydratePlan } from "@/lib/llm/snapshot";
import { executeToolProposal } from "@/lib/llm/tools";
afterEach(() => vi.unstubAllGlobals());
describe("storage and stream boundaries", () => {
  it("keeps edited milestone IDs, custom vendors and budget locks in chat transport", () => {
    const plan = createPlan(exampleInput());
    plan.timeline.milestones[0].status = "done";
    plan.timeline.milestones[0].notes = "Edited by the planner";
    plan.budget.lines[0].locked = true;
    const snapshot = compactPlanSnapshot(plan);
    expect(
      new TextEncoder().encode(
        JSON.stringify({ plan: snapshot, message: "What next?" }),
      ).length,
    ).toBeLessThan(32768);
    const hydrated = hydratePlan(snapshot);
    expect(hydrated.timeline.milestones[0].id).toBe(
      plan.timeline.milestones[0].id,
    );
    expect(hydrated.timeline.milestones[0].status).toBe("done");
    expect(hydrated.budget.lines[0].locked).toBe(true);
  });
  it("preserves pinned allocations when chat changes guests or the total", () => {
    const plan = createPlan(exampleInput());
    plan.budget.lines[0].locked = true;
    const amount = plan.budget.lines[0].allocatedAmount;
    const guests = executeToolProposal(plan, {
      id: "guests",
      name: "set_guest_count",
      arguments: { value: 100 },
    });
    expect(guests.budget.lines).toEqual(plan.budget.lines);
    expect(guests.budget.perGuestCost).toBe(8000);
    const budget = executeToolProposal(plan, {
      id: "budget",
      name: "set_total_budget",
      arguments: { value: 900000 },
    });
    expect(budget.budget.lines[0].allocatedAmount).toBe(amount);
    expect(budget.budget.lines[0].locked).toBe(true);
    expect(
      budget.budget.lines.reduce((s, l) => s + l.allocatedAmount, 0) +
        budget.budget.contingencyAmount,
    ).toBe(900000);
  });
  it("migrates valid plans and discards corrupt state without losing valid siblings", () => {
    const p = createPlan(exampleInput());
    const result = migratePlans({
      plans: [p, { id: "bad" }],
      currentPlanId: p.id,
    });
    expect(result.plans).toHaveLength(1);
    expect(result.currentPlanId).toBe(p.id);
    expect(migratePlans(null)).toEqual({ plans: [], currentPlanId: null });
  });
  it("consumes split UTF8 SSE frames and rejects error responses", async () => {
    const bytes = new TextEncoder().encode(
      'event: summary\ndata: {"text":"₹ celebration"}\n\nevent: complete\ndata: {"ok":true}\n\n',
    );
    const calls: unknown[] = [];
    await consumeSSE(
      new Response(
        new ReadableStream({
          start(c) {
            for (let i = 0; i < bytes.length; i += 3)
              c.enqueue(bytes.slice(i, i + 3));
            c.close();
          },
        }),
      ),
      (event, data) => calls.push({ event, data }),
    );
    expect(calls).toEqual([
      { event: "summary", data: { text: "₹ celebration" } },
      { event: "complete", data: { ok: true } },
    ]);
    await expect(
      consumeSSE(
        Response.json({ error: "Wait a minute" }, { status: 429 }),
        () => {},
      ),
    ).rejects.toThrow("Wait a minute");
  });
  it("safe storage does not throw when unavailable", () => {
    vi.stubGlobal("localStorage", {
      getItem() {
        throw Error("blocked");
      },
      setItem() {
        throw Error("quota");
      },
      removeItem() {
        throw Error("blocked");
      },
    });
    expect(safeStorage.getItem("p")).toBeNull();
    expect(() => safeStorage.setItem("p", "data")).not.toThrow();
    expect(() => safeStorage.removeItem("p")).not.toThrow();
  });
});
