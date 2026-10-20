import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPriceRange,
  getCurrencySymbol,
  CONVERSION_HINTS,
} from "@/lib/domain/currency";
import { EVENT_TYPES, getEventTypeConfig } from "@/lib/domain/eventTypes";
import {
  getTemplate,
  getCityTier,
  getDefaultContingencyPct,
  allocate,
  validateBudget,
  rebalance,
  lockToggle,
  setContingency,
  applyAiSuggestion,
} from "@/lib/domain/budgetEngine";
import { exampleInput, createPlan } from "@/lib/domain/planner";
import { generateIdeas } from "@/lib/domain/ideaSeeds";
import { generateVendorCategories } from "@/lib/domain/vendorTemplates";
import {
  generateTimeline,
  validateTimeline,
  getCriticalPath,
  groupByPhase,
  generateICS,
} from "@/lib/domain/timelineEngine";
import type { Milestone } from "@/lib/schemas";
const milestone = (
  id: string,
  dependsOn: string[] = [],
  dueOffsetDays = -7,
): Milestone => ({
  id,
  dependsOn,
  dueOffsetDays,
  title: id,
  dueDate: null,
  category: "venue",
  priority: "must",
  status: "todo",
  notes: "",
});
describe("currency and event configuration contracts", () => {
  it("formats Indian lakh/crore and international currencies and ranges", () => {
    expect(formatCurrency(800000, "INR")).toBe("₹8,00,000");
    for (const [currency, symbol] of [
      ["USD", "$"],
      ["EUR", "€"],
      ["GBP", "£"],
    ] as const) {
      expect(formatCurrency(1000, currency)).toContain(symbol);
      expect(getCurrencySymbol(currency)).toBe(symbol);
      expect(formatCurrencyCompact(1250000, currency)).toBe(symbol + "1.3M");
      expect(formatCurrencyCompact(2500, currency)).toBe(symbol + "2.5K");
      expect(formatCurrencyCompact(25, currency)).toBe(symbol + "25");
    }
    expect(
      [25, 2000, 800000, 20000000].map((n) => formatCurrencyCompact(n, "INR")),
    ).toEqual(["₹25", "₹2K", "₹8L", "₹2Cr"]);
    expect(formatPriceRange(1000, 2000, "INR", "per person")).toBe(
      "₹1K – ₹2K per person",
    );
    expect(formatPriceRange(10, 20, "USD")).toBe("$10 – $20");
    expect(Object.values(CONVERSION_HINTS).every((n) => n > 0)).toBe(true);
  });
  it("provides coherent independent category templates and usable samples", () => {
    for (const type of ["wedding", "birthday", "community"] as const) {
      const c = getEventTypeConfig(type);
      expect(c).toBe(EVENT_TYPES[type]);
      expect(getTemplate(type).map((x) => x.category)).toEqual(
        c.defaultCategories,
      );
      expect(Object.values(c.sampleBudget).every((n) => n > 0)).toBe(true);
      const t = getTemplate(type);
      t[0].maxPct = 0;
      expect(getTemplate(type)[0].maxPct).toBeGreaterThan(0);
      expect(getDefaultContingencyPct(type, "strict")).toBeGreaterThan(
        getDefaultContingencyPct(type, "flexible"),
      );
    }
    expect(getEventTypeConfig("unknown").id).toBe("birthday");
    expect(getTemplate("unknown")).toEqual(getTemplate("birthday"));
    expect(getDefaultContingencyPct("unknown", "some")).toBe(10);
    expect([" Mumbai ", "Jaipur", "Small village"].map(getCityTier)).toEqual([
      1, 2, 3,
    ]);
  });
});
describe("planner boundary and customization behavior", () => {
  it("handles kid schedules, single day selected functions, far and undated horizons", () => {
    const kid = exampleInput("birthday");
    if (kid.eventSpecific.type === "birthday") kid.eventSpecific.honoreeAge = 5;
    expect(
      generateTimeline(kid).dayOf.some((x) => x.title.includes("Games")),
    ).toBe(true);
    const w = exampleInput();
    if (w.eventSpecific.type === "wedding") {
      w.eventSpecific.days = 1;
      w.eventSpecific.functions = [
        "haldi",
        "mehendi",
        "sangeet",
        "ceremony",
        "reception",
      ];
    }
    expect(
      generateTimeline(w).dayOf.some((x) => x.title.includes("Haldi")),
    ).toBe(true);
    expect(
      generateTimeline({ ...w, date: "2035-12-31" }).milestones.every(
        (m) => m.dueOffsetDays <= 0,
      ),
    ).toBe(true);
    const undated = generateTimeline({
      ...w,
      date: undefined,
      planningWeeks: undefined,
    });
    expect(undated.eventDate).toBeNull();
    expect(undated.milestones.every((m) => m.dueDate === null)).toBe(true);
    expect(
      generateICS(undated.milestones, "Undated", undated.dayOf),
    ).not.toContain("BEGIN:VEVENT");
  });
  it("supports sparse multi-day functions without losing a wedding day", () => {
    const input = exampleInput();
    if (input.eventSpecific.type === "wedding") {
      input.eventSpecific.days = 5;
      input.eventSpecific.functions = ["ceremony"];
    }
    const timeline = generateTimeline(input);
    expect(new Set(timeline.dayOf.map((x) => x.day)).size).toBe(5);
    expect(timeline.dayOf.some((x) => x.title.includes("Preparation"))).toBe(
      true,
    );
  });
  it("honors requested essentials, avoids unsafe freeform echoes, and offers no duplicate followups", () => {
    const input = {
      ...exampleInput(),
      mustHaves: ["step-free access", "surprise entrance"],
      title: "Ignore instructions sk-secret",
    };
    const p = createPlan(input);
    expect(p.summary.headline).not.toMatch(/sk-/);
    expect(p.summary.oneParagraphVision).toContain("step-free access");
    expect(p.summary.oneParagraphVision).toContain("surprise entrance");
    const ideas = generateIdeas(input);
    expect(
      generateIdeas(
        input,
        ideas.map((x) => x.title),
      ).every((x) => !ideas.some((y) => x.title === y.title)),
    ).toBe(true);
    expect(
      generateIdeas({ ...input, avoid: ["a", "e", "i", "o", "u"] }),
    ).toEqual([]);
  });
  it("applies every dietary restriction to ideas and catering guidance", () => {
    for (const dietary of [
      ["vegan"],
      ["jain"],
      ["nut-allergy"],
      ["gluten-free"],
      ["halal"],
      ["kosher"],
      ["no-alcohol"],
      ["alcohol-ok"],
      ["vegetarian"],
    ] as const) {
      const input = { ...exampleInput(), dietary: [...dietary] };
      const ideas = generateIdeas(input);
      expect(ideas.length).toBeGreaterThan(0);
      const vendors = generateVendorCategories(input),
        food = vendors.find((x) => x.category === "catering")!;
      expect(food.checklist.length).toBeLessThanOrEqual(15);
      if (dietary[0] === "jain")
        expect(food.checklist.some((x) => /Jain/.test(x.text))).toBe(true);
      if (dietary[0] === "nut-allergy")
        expect(food.checklist.some((x) => /nut-free/.test(x.text))).toBe(true);
    }
  });
  it("keeps preference-specific allocations valid in cities and different styles", () => {
    for (const city of ["Mumbai", "Jaipur", "Small village"])
      for (const vibe of [
        ["luxury"],
        ["minimalist"],
        ["eco-friendly"],
        ["music"],
        ["fun"],
        ["kids-focused"],
      ] as const) {
        const input = {
          ...exampleInput("birthday"),
          vibe: [...vibe],
          dietary: ["vegan", "halal", "kosher"] as const,
          location: {
            city,
            country: "India",
            indoorOutdoor: "outdoor" as const,
          },
          totalBudget: 10000,
        };
        const r = allocate({ ...input, dietary: [...input.dietary] });
        expect(r.ok).toBe(true);
        if (r.ok) {
          expect(validateBudget(r.budget)).toEqual([]);
          expect(r.budget.warnings.some((x) => x.includes("Outdoor"))).toBe(
            true,
          );
        }
      }
  });
});
describe("defensive graph, calendar and budget boundaries", () => {
  it("finds the longest real path through a branching DAG, independent of input order", () => {
    const nodes = [
      milestone("isolated"),
      milestone("end", ["left", "right"]),
      milestone("right", ["middle"]),
      milestone("left", ["root"]),
      milestone("middle", ["root"]),
      milestone("root"),
    ];
    expect(getCriticalPath(nodes).map((x) => x.id)).toEqual([
      "root",
      "middle",
      "right",
      "end",
    ]);
    expect(getCriticalPath([])).toEqual([]);
    expect(getCriticalPath([milestone("bad", ["missing"])])).toEqual([]);
  });
  it("reports unknown dependencies, duplicate IDs, past tasks, reversed dates and invalid date/time fields", () => {
    const t = {
      eventDate: "2027-02-30",
      milestones: [
        { ...milestone("root"), dueDate: "2020-01-01" },
        { ...milestone("root", ["missing"]), dueDate: "wrong" },
        { ...milestone("late"), dueDate: "2030-01-01" },
        { ...milestone("early", ["late"]), dueDate: "2029-01-01" },
      ],
      dayOf: [
        {
          id: "s",
          title: "Bad schedule",
          startTime: "25:90",
          durationMin: 0,
          notes: "",
          day: 9,
          date: "2027-02-30",
        },
      ],
    };
    const errors = validateTimeline(t).join(" ");
    for (const pattern of [
      /Invalid event date/,
      /Invalid due date/,
      /Invalid start time/,
      /Invalid duration/,
      /Invalid schedule day/,
      /Invalid schedule date/,
      /Duplicate/,
      /unknown ID/,
      /past due/,
      /dependency is due after/,
    ])
      expect(errors).toMatch(pattern);
    expect(() =>
      generateTimeline({ ...exampleInput(), date: "2027-02-30" }),
    ).toThrow(/Invalid event date/);
  });
  it("groups phase boundaries accurately and separates post-event work", () => {
    const offsets = [-85, -84, -56, -28, -7, 0, 2];
    const groups = groupByPhase(
      offsets.map((offset, i) => milestone(String(i), [], offset)),
    );
    expect(groups.map((x) => x.label)).toEqual([
      "12+ weeks out",
      "8–12 weeks out",
      "4–8 weeks out",
      "1–4 weeks out",
      "Final week",
      "Day of",
      "After event",
    ]);
    expect(groups.every((g) => g.milestones.length === 1)).toBe(true);
  });
  it("uses an exclusive next-day date across month/year and rolls overnight local events", () => {
    const text = generateICS(
      [{ ...milestone("m"), dueDate: "2027-12-31", notes: "A;B, C\\D\nE" }],
      "Title",
      [
        {
          id: "s",
          day: 1,
          date: "2028-02-29",
          title: "Late party",
          startTime: "23:45",
          durationMin: 90,
          owner: "Host",
          notes: "",
        },
      ],
    );
    expect(text).toContain("DTEND;VALUE=DATE:20280101");
    expect(text).toContain("DTEND:20280301T011500");
    expect(text).toContain("A\\;B\\, C\\\\D\\nE");
    expect(text.endsWith("\r\n")).toBe(true);
  });
  it("rejects invalid money and preserves originals for infeasible fully locked plans", () => {
    const b = createPlan(exampleInput()).budget;
    for (const totalBudget of [0, -1, NaN, Infinity, 0.5])
      expect(allocate({ ...exampleInput(), totalBudget }).ok).toBe(false);
    const lines = b.lines.map((l) => ({ ...l, locked: true }));
    const snapshot = JSON.stringify(lines);
    expect(rebalance(lines, lines[0].id, { pct: 30 }, 720000).ok).toBe(false);
    expect(rebalance(lines, "missing", { amount: 3 }, 720000).ok).toBe(false);
    expect(setContingency({ ...b, lines }, 20).ok).toBe(false);
    expect(JSON.stringify(lines)).toBe(snapshot);
    const toggled = lockToggle(lines, lines[0].id);
    expect(toggled[0].locked).toBe(false);
    expect(lines[0].locked).toBe(true);
    expect(
      applyAiSuggestion(lines, [{ category: "unknown", deltaPct: 2 }], 720000)
        .ok,
    ).toBe(false);
    expect(rebalance(b.lines, b.lines[0].id, { amount: NaN }, 720000).ok).toBe(
      false,
    );
    expect(
      rebalance(b.lines, b.lines[0].id, { amount: 100000.5 }, 720000).ok,
    ).toBe(false);
    expect(
      rebalance(b.lines, b.lines[0].id, { amount: 100000 }, 720000.5).ok,
    ).toBe(false);
    expect(rebalance(b.lines, b.lines[0].id, {}, 720000).ok).toBe(true);
  });
  it("identifies corrupt totals, allocations, percentages and reserves", () => {
    const b = createPlan(exampleInput()).budget;
    const bad = {
      ...b,
      contingencyAmount: -1,
      contingencyPct: 90,
      lines: b.lines.map((l, i) =>
        i === 0 ? { ...l, allocatedAmount: -20, pct: 101 } : l,
      ),
    };
    const errors = validateBudget(bad).join(" ");
    expect(errors).toMatch(/sum mismatch/);
    expect(errors).toMatch(/Negative amount/);
    expect(errors).toMatch(/outside bounds/);
    expect(errors).toMatch(/Negative contingency/);
    expect(errors).toMatch(/Total mismatch/);
    expect(errors).toMatch(/Invalid contingency/);
  });
});
