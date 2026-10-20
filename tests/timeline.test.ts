import { describe, it, expect, vi, afterEach } from "vitest";
import { createPlan, exampleInput } from "@/lib/domain/planner";
import {
  generateTimeline,
  generateICS,
  validateTimeline,
  getCriticalPath,
} from "@/lib/domain/timelineEngine";
afterEach(() => vi.useRealTimers());
describe("timeline and calendar correctness", () => {
  it("clamps past milestone dates and surfaces ASAP risk", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T14:00:00Z"));
    const p = createPlan({ ...exampleInput(), date: "2020-01-01" });
    expect(p.timeline.milestones.every((m) => m.dueDate === "2026-10-20")).toBe(
      true,
    );
    expect(p.summary.keyRisks.join(" ")).toMatch(/past event date/i);
    expect(p.timeline.milestones.some((m) => m.notes.includes("ASAP"))).toBe(
      true,
    );
  });
  it("generates a dependency path, detects cycles and date ordering warnings", () => {
    const t = generateTimeline(exampleInput());
    expect(validateTimeline(t)).toEqual([]);
    expect(getCriticalPath(t.milestones).length).toBeGreaterThan(1);
    t.milestones[0].dependsOn = [t.milestones.at(-1)!.id];
    expect(validateTimeline(t).join(" ")).toMatch(/cycle/i);
    expect(getCriticalPath(t.milestones)).toEqual([]);
  });
  it("folds unicode by UTF8 bytes, uses legal event status and exclusive all-day ends", () => {
    const p = createPlan(exampleInput());
    const text = generateICS(
      p.timeline.milestones,
      "🎉".repeat(100),
      p.timeline.dayOf,
      p.timeline.eventDate,
    );
    for (const line of text.split("\r\n"))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(text).not.toMatch(/STATUS:(COMPLETED|NEEDS-ACTION)/);
    expect(text).toContain("DTEND;VALUE=DATE:");
    expect((text.match(/BEGIN:VEVENT/g) || []).length).toBe(
      p.timeline.milestones.length + p.timeline.dayOf.length,
    );
    expect(text.replace(/\r\n /g, "")).toContain("🎉".repeat(100));
  });
  it("exports each wedding day at its distinct local calendar date", () => {
    const input = exampleInput();
    if (input.eventSpecific.type !== "wedding") throw Error();
    input.date = "2027-03-01";
    input.eventSpecific.days = 3;
    const t = generateTimeline(input);
    expect(new Set(t.dayOf.map((x) => x.day)).size).toBe(3);
    const text = generateICS([], "Wedding", t.dayOf, t.eventDate);
    expect(text).toContain("DTSTART:20270303T");
  });
});
