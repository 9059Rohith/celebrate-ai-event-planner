import { describe, it, expect } from "vitest";
import { exampleInput, createPlan } from "@/lib/domain/planner";
import { EventInputSchema, PlanSchema } from "@/lib/schemas";
import { rebalance, setContingency } from "@/lib/domain/budgetEngine";
import { encodePlan, decodePlan } from "@/lib/share";
import { generateICS } from "@/lib/domain/timelineEngine";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
describe("complete deterministic plans", () => {
  for (const type of ["wedding", "birthday", "community"] as const)
    for (const currency of ["INR", "USD", "EUR", "GBP"] as const)
      it(`${type} ${currency} has exact math and valid sections`, () => {
        const p = createPlan({ ...exampleInput(type), currency });
        expect(PlanSchema.safeParse(p).success).toBe(true);
        expect(
          p.budget.lines.reduce((s, l) => s + l.allocatedAmount, 0) +
            p.budget.contingencyAmount,
        ).toBe(p.budget.total);
        expect(p.vendors.length).toBeGreaterThan(0);
        expect(p.ideas.length).toBeGreaterThan(0);
        expect(p.timeline.milestones.length).toBeGreaterThan(0);
      });
  it("preserves totals and locked lines across a range of allocations", () => {
    const p = createPlan(exampleInput());
    for (const line of p.budget.lines)
      for (const pct of [
        line.minPct,
        (line.minPct + line.maxPct) / 2,
        line.maxPct,
      ]) {
        const locked = { ...p.budget.lines[1], locked: true };
        const lines = p.budget.lines.map((l, i) => (i === 1 ? locked : l));
        if (line.id === locked.id) continue;
        const r = rebalance(
          lines,
          line.id,
          { pct },
          p.budget.total - p.budget.contingencyAmount,
        );
        if (r.ok) {
          expect(r.lines.reduce((s, l) => s + l.allocatedAmount, 0)).toBe(
            p.budget.total - p.budget.contingencyAmount,
          );
          expect(r.lines.find((l) => l.id === locked.id)?.allocatedAmount).toBe(
            locked.allocatedAmount,
          );
          expect(r.lines.every((l) => l.allocatedAmount >= 0)).toBe(true);
        }
      }
  });
  it("reserves contingency exactly", () => {
    const p = createPlan(exampleInput());
    for (let pct = 5; pct <= 20; pct++) {
      const r = setContingency(p.budget, pct);
      expect(r.ok).toBe(true);
      if (r.ok)
        expect(
          r.budget.lines.reduce((s, l) => s + l.allocatedAmount, 0) +
            r.budget.contingencyAmount,
        ).toBe(p.budget.total);
    }
  });
  it("validates event details and input limits", () => {
    expect(
      EventInputSchema.safeParse({ ...exampleInput(), guestCount: 0 }).success,
    ).toBe(false);
    expect(() =>
      createPlan({ ...exampleInput(), eventType: "birthday" }),
    ).toThrow();
  });
  it("round-trips compressed sharing and rejects malicious payloads", () => {
    const p = createPlan(exampleInput());
    expect(decodePlan(encodePlan(p)!)?.id).toBe(p.id);
    expect(decodePlan("x".repeat(65537))).toBeNull();
    expect(decodePlan("invalid")).toBeNull();
  });
  it("exports dated calendar milestones", () => {
    const p = createPlan(exampleInput());
    const ics = generateICS(p.timeline.milestones, "Wedding, celebration");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("Wedding\\, celebration");
    expect(ics).toContain("\r\n");
  });
  it("never references private API keys in client pages or components", () => {
    function files(dir: string): string[] {
      return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
      );
    }
    for (const f of [
      ...files("components"),
      ...files("app").filter((f) => f.endsWith("page.tsx")),
    ])
      expect(readFileSync(f, "utf8")).not.toMatch(
        /process\.env\.(OPENAI_API_KEY|EVAL_SECRET)/,
      );
  });
});
