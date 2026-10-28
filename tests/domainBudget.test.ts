import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { createPlan, exampleInput } from "@/lib/domain/planner";
import {
  allocate,
  rebalance,
  setContingency,
  applyAiSuggestion,
  validateBudget,
} from "@/lib/domain/budgetEngine";

describe("budget invariant properties", () => {
  it("keeps feasible allocations fixed for unchanged contingency and empty or zero advice", () => {
    for (const eventType of ["wedding", "birthday", "community"] as const) {
      const budget = createPlan(exampleInput(eventType)).budget;
      budget.lines[0].locked = true;
      const contingency = setContingency(budget, budget.contingencyPct);
      expect(contingency).toEqual({ ok: true, budget });
      for (const suggestions of [
        [],
        [{ category: budget.lines[1].category, deltaPct: 0 }],
      ]) {
        const result = applyAiSuggestion(
          budget.lines,
          suggestions,
          budget.total - budget.contingencyAmount,
        );
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.lines).toEqual(budget.lines);
      }
    }
  });
  it("keeps very small schema-valid budgets feasible with honest consolidation", () => {
    for (let totalBudget = 1; totalBudget < 1000; totalBudget++) {
      const result = allocate({ ...exampleInput(), totalBudget });
      expect(result.ok).toBe(true);
      if (result.ok) expect(validateBudget(result.budget)).toEqual([]);
    }
  });
  it("keeps exact totals and strict percentage bounds after arbitrary edits", () =>
    fc.assert(
      fc.property(
        fc.integer({ min: 10000, max: 10000000 }),
        fc.integer({ min: 0, max: 11 }),
        fc.integer({ min: 0, max: 100 }),
        fc.boolean(),
        (total, index, pct, lock) => {
          const input = { ...exampleInput(), totalBudget: total };
          const allocation = allocate(input);
          expect(allocation.ok).toBe(true);
          if (!allocation.ok) return;
          const budget = allocation.budget;
          expect(validateBudget(budget)).toEqual([]);
          const lines = budget.lines.map((l, i) => ({
            ...l,
            locked: lock && i === 0,
          }));
          const snapshot = JSON.stringify(lines);
          const r = rebalance(
            lines,
            lines[index].id,
            { pct },
            total - budget.contingencyAmount,
          );
          expect(JSON.stringify(lines)).toBe(snapshot);
          if (r.ok) {
            expect(
              r.lines.reduce((n, l) => n + l.allocatedAmount, 0) +
                budget.contingencyAmount,
            ).toBe(total);
            for (const l of r.lines) {
              expect(l.pct).toBeGreaterThanOrEqual(l.minPct - 1e-8);
              expect(l.pct).toBeLessThanOrEqual(l.maxPct + 1e-8);
              if (l.locked)
                expect(l.allocatedAmount).toBe(
                  lines.find((x) => x.id === l.id)!.allocatedAmount,
                );
            }
          }
        },
      ),
      { numRuns: 200 },
    ));
  it("preserves locks under contingency and AI suggestions", () =>
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 20 }),
        fc.integer({ min: -100, max: 100 }),
        (pct, delta) => {
          const budget = createPlan(exampleInput()).budget;
          budget.lines[0].locked = true;
          const before = budget.lines[0].allocatedAmount;
          const r = setContingency(budget, pct);
          if (r.ok) {
            expect(r.budget.lines[0].allocatedAmount).toBe(before);
            expect(validateBudget(r.budget)).toEqual([]);
          }
          const ai = applyAiSuggestion(
            budget.lines,
            [{ category: "catering", deltaPct: delta }],
            budget.total - budget.contingencyAmount,
          );
          expect(ai.ok).toBe(true);
          if (ai.ok) {
            expect(ai.lines[0].allocatedAmount).toBe(before);
            expect(validateBudget({ ...budget, lines: ai.lines })).toEqual([]);
          }
        },
      ),
      { numRuns: 100 },
    ));
  it("rejects nonfinite and out-of-policy adjustments atomically", () => {
    const p = createPlan(exampleInput());
    for (const n of [NaN, Infinity, -1, 21])
      expect(setContingency(p.budget, n).ok).toBe(false);
    expect(
      applyAiSuggestion(
        p.budget.lines,
        [{ category: "catering", deltaPct: NaN }],
        720000,
      ).ok,
    ).toBe(false);
  });
});
