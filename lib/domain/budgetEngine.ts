import {
  getCityMultiplier,
  getTemplate,
  getCityTier,
  getDefaultContingencyPct,
  applyPriorityBoost,
  applyVibeAdjustments,
} from "./budgetTemplates";
export {
  getTemplate,
  getCityTier,
  getDefaultContingencyPct,
} from "./budgetTemplates";
export type { BudgetTemplate } from "./budgetTemplates";
/**
 * Deterministic Budget Engine
 *
 * All money math is done here — the LLM never does arithmetic.
 * Pure functions, no framework imports, fully unit-testable.
 */
import type { EventInput, BudgetLine, Budget } from "@/lib/schemas";
export type AllocateResult =
  | {
      ok: true;
      budget: Budget;
    }
  | {
      ok: false;
      error: string;
    };
export type RebalanceResult =
  | {
      ok: true;
      lines: BudgetLine[];
      warnings: string[];
    }
  | {
      ok: false;
      error: string;
    };
function largestRemainder(
  weights: Map<string, number>,
  distributable: number,
): Map<string, number> {
  const totalWeight = Array.from(weights.values()).reduce((a, b) => a + b, 0);
  const items: {
    category: string;
    ideal: number;
    floored: number;
    remainder: number;
  }[] = [];
  for (const [category, weight] of weights) {
    const ideal = (weight / totalWeight) * distributable;
    const floored = Math.floor(ideal);
    items.push({
      category,
      ideal,
      floored,
      remainder: ideal - floored,
    });
  }
  items.sort((a, b) => b.remainder - a.remainder);
  const flooredTotal = items.reduce((sum, item) => sum + item.floored, 0);
  let leftover = Math.round(distributable) - flooredTotal;
  const result = new Map<string, number>();
  for (const item of items) {
    let amount = item.floored;
    if (leftover > 0) {
      amount += 1;
      leftover -= 1;
    }
    result.set(item.category, amount);
  }
  return result;
}
let idCounter = 0;
function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now()}_${idCounter}`;
}
export function allocate(input: EventInput): AllocateResult {
  try {
    if (
      !Number.isSafeInteger(input.totalBudget) ||
      input.totalBudget <= 0 ||
      !Number.isInteger(input.guestCount) ||
      input.guestCount < 2
    )
      return {
        ok: false,
        error: "Budget and guest count must be positive whole numbers",
      };
    const {
      eventType,
      totalBudget,
      currency,
      budgetFlexibility,
      guestCount,
      dietary,
      vibe,
      priorities,
    } = input;
    const contingencyPct = getDefaultContingencyPct(
      eventType,
      budgetFlexibility,
    );
    const contingencyAmount = Math.round((totalBudget * contingencyPct) / 100);
    const distributable = totalBudget - contingencyAmount;
    if (distributable <= 0) {
      return {
        ok: false,
        error: "Budget too small after contingency allocation",
      };
    }
    const templates = getTemplate(eventType);
    const weights = new Map<string, number>();
    for (const t of templates) {
      weights.set(t.category, t.defaultPct);
    }
    applyPriorityBoost(weights, priorities, templates);
    applyVibeAdjustments(weights, vibe, dietary);
    const allocations = largestRemainder(weights, distributable);
    const lines: BudgetLine[] = templates.map((t) => {
      const amount = allocations.get(t.category) ?? 0;
      const pct = distributable > 0 ? (amount / distributable) * 100 : 0;
      return {
        id: generateId("bl"),
        category: t.category,
        label: t.label,
        allocatedAmount: amount,
        pct,
        minPct: t.minPct,
        maxPct: t.maxPct,
        locked: false,
        notes: "",
        estimateConfidence: "medium" as const,
      };
    });
    const lineSum = lines.reduce((s, l) => s + l.allocatedAmount, 0);
    if (lineSum !== distributable) {
      const diff = distributable - lineSum;
      lines[lines.length - 1].allocatedAmount += diff;
    }
    const bounded = distribute(lines, distributable);
    if (!bounded.ok) {
      if (totalBudget >= 1000) return bounded;
      lines.splice(0, lines.length, {
        id: generateId("bl"),
        category: "essentials",
        label: "Essential costs — consolidated tiny budget",
        allocatedAmount: distributable,
        pct: 100,
        minPct: 0,
        maxPct: 100,
        locked: false,
        notes:
          "Individual category minimums cannot be represented in whole currency units at this budget. Obtain actual quotes and increase the budget or reduce scope.",
        estimateConfidence: "low",
      });
    } else lines.splice(0, lines.length, ...bounded.lines);
    const perGuestCost = totalBudget / guestCount;
    const warnings = generateWarnings(input, lines, perGuestCost);
    if (lines.some((l) => l.category === "essentials"))
      warnings.unshift(
        "Budget infeasible for separate category minimums in whole currency units: essential costs are consolidated; reduce scope or increase the budget.",
      );
    return {
      ok: true,
      budget: {
        currency,
        total: totalBudget,
        contingencyPct,
        contingencyAmount,
        lines,
        perGuestCost,
        warnings,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: `Budget allocation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}
function generateWarnings(
  input: EventInput,
  lines: BudgetLine[],
  perGuestCost: number,
): string[] {
  const warnings: string[] = [];
  const cityMultiplier = getCityMultiplier(input.location.city);
  const currencyMultipliers: Record<string, number> = {
    INR: 1,
    USD: 83,
    EUR: 90,
    GBP: 105,
  };
  const currMul = currencyMultipliers[input.currency] ?? 1;
  const cateringLine = lines.find(
    (l) => l.category === "catering" || l.category === "food",
  );
  if (cateringLine) {
    const cateringPerGuest = cateringLine.allocatedAmount / input.guestCount;
    const minCateringInr = 500 * cityMultiplier;
    const maxCateringInr = 900 * cityMultiplier;
    const minCateringLocal = Math.round(minCateringInr / currMul);
    if (cateringPerGuest < minCateringLocal) {
      warnings.push(
        `Catering budget ${formatCurrencyShort(cateringPerGuest, input.currency)}/guest is below typical ${formatCurrencyShort(minCateringLocal, input.currency)}–${formatCurrencyShort(Math.round(maxCateringInr / currMul), input.currency)} for ${getCityTier(input.location.city) === 1 ? "metro" : getCityTier(input.location.city) === 2 ? "tier-2" : "tier-3"} cities — consider reducing guest count or increasing budget.`,
      );
    }
  }
  const minPerGuestInr =
    input.eventType === "wedding"
      ? 2000
      : input.eventType === "birthday"
        ? 500
        : 300;
  const minPerGuestLocal = Math.round(
    (minPerGuestInr * cityMultiplier) / currMul,
  );
  if (perGuestCost < minPerGuestLocal) {
    warnings.push(
      `Overall budget ${formatCurrencyShort(perGuestCost, input.currency)}/guest is quite tight. Typical minimum for a ${input.eventType} in a similar city is around ${formatCurrencyShort(minPerGuestLocal, input.currency)}/guest.`,
    );
  }
  if (input.eventSpecific.type === "wedding" && input.eventSpecific.days > 1) {
    warnings.push(
      `Multi-day wedding (${input.eventSpecific.days} days) — budget is spread across functions. Consider prioritizing key functions.`,
    );
  }
  if (input.location.indoorOutdoor === "outdoor") {
    warnings.push(
      "Outdoor venue selected — budget includes provisions for weather contingency (tent/canopy, backup plan).",
    );
  }
  return warnings;
}
function formatCurrencyShort(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };
  return `${symbols[currency] ?? ""}${amount.toLocaleString("en-IN")}`;
}
/** Bounded whole-unit apportionment. All failure paths preserve the input. */
function distribute(current: BudgetLine[], total: number): RebalanceResult {
  const lines = current.map((l) => ({ ...l })),
    free = lines.filter((l) => !l.locked);
  const bounds = (l: BudgetLine) => [
    Math.ceil((total * l.minPct) / 100 - 1e-8),
    Math.floor((total * l.maxPct) / 100 + 1e-8),
  ];
  if (
    !Number.isSafeInteger(total) ||
    total < 0 ||
    lines.some(
      (l) =>
        !Number.isFinite(l.allocatedAmount) ||
        l.allocatedAmount < 0 ||
        (l.locked && !Number.isSafeInteger(l.allocatedAmount)) ||
        bounds(l)[0] > bounds(l)[1],
    )
  )
    return { ok: false, error: "Invalid budget" };
  let remaining =
    total -
    lines.filter((l) => l.locked).reduce((n, l) => n + l.allocatedAmount, 0);
  if (
    lines
      .filter((l) => l.locked)
      .some(
        (l) =>
          l.allocatedAmount < bounds(l)[0] || l.allocatedAmount > bounds(l)[1],
      ) ||
    remaining < free.reduce((n, l) => n + bounds(l)[0], 0) ||
    remaining > free.reduce((n, l) => n + bounds(l)[1], 0)
  )
    return {
      ok: false,
      error: "Category bounds and locks cannot fit this allocation",
    };
  // A feasible whole-unit allocation is already a fixed point. Re-apportioning
  // its full weights above the minimums would move money on no-op requests.
  if (
    lines.reduce((sum, line) => sum + line.allocatedAmount, 0) === total &&
    lines.every(
      (line) =>
        Number.isSafeInteger(line.allocatedAmount) &&
        line.allocatedAmount >= bounds(line)[0] &&
        line.allocatedAmount <= bounds(line)[1],
    )
  )
    return {
      ok: true,
      lines: lines.map((line) => ({
        ...line,
        pct: total ? (line.allocatedAmount / total) * 100 : 0,
      })),
      warnings: [],
    };
  const weights = new Map(
    free.map((l) => [l.id, Math.max(l.allocatedAmount, 1)]),
  );
  for (const l of free) {
    l.allocatedAmount = bounds(l)[0];
    remaining -= l.allocatedAmount;
  }
  let active = free.filter((l) => l.allocatedAmount < bounds(l)[1]);
  while (remaining > 0 && active.length) {
    const sum = active.reduce((n, l) => n + weights.get(l.id)!, 0);
    let used = 0;
    for (const l of active) {
      const add = Math.min(
        bounds(l)[1] - l.allocatedAmount,
        Math.max(1, Math.floor((remaining * weights.get(l.id)!) / sum)),
        remaining - used,
      );
      l.allocatedAmount += add;
      used += add;
    }
    remaining -= used;
    active = active.filter((l) => l.allocatedAmount < bounds(l)[1]);
  }
  for (const l of lines) l.pct = total ? (l.allocatedAmount / total) * 100 : 0;
  return lines.reduce((n, l) => n + l.allocatedAmount, 0) === total
    ? { ok: true, lines, warnings: [] }
    : { ok: false, error: "Budget requires whole currency units" };
}
export function rebalance(
  current: BudgetLine[],
  changedId: string,
  change: { pct?: number; amount?: number },
  distributable: number,
): RebalanceResult {
  const target = current.find((l) => l.id === changedId);
  if (!target || target.locked)
    return { ok: false, error: "Category is missing or locked" };
  const amount =
    change.amount ??
    Math.round((distributable * (change.pct ?? target.pct)) / 100);
  if (
    !Number.isSafeInteger(amount) ||
    amount < (distributable * target.minPct) / 100 - 1e-8 ||
    amount > (distributable * target.maxPct) / 100 + 1e-8
  )
    return { ok: false, error: "Requested allocation is outside bounds" };
  const r = distribute(
    current.map((l) =>
      l.id === changedId ? { ...l, allocatedAmount: amount, locked: true } : l,
    ),
    distributable,
  );
  return r.ok
    ? {
        ...r,
        lines: r.lines.map((l) =>
          l.id === changedId ? { ...l, locked: false } : l,
        ),
      }
    : r;
}
export function lockToggle(lines: BudgetLine[], lineId: string): BudgetLine[] {
  return lines.map((l) => (l.id === lineId ? { ...l, locked: !l.locked } : l));
}
export function setContingency(budget: Budget, newPct: number): AllocateResult {
  if (!Number.isFinite(newPct) || newPct < 5 || newPct > 20)
    return { ok: false, error: "Contingency must be between 5% and 20%" };
  const contingencyAmount = Math.round((budget.total * newPct) / 100),
    r = distribute(budget.lines, budget.total - contingencyAmount);
  return r.ok
    ? {
        ok: true,
        budget: {
          ...budget,
          contingencyPct: newPct,
          contingencyAmount,
          lines: r.lines,
        },
      }
    : r;
}
/** AI supplies weights; deterministic bounds and locks remain authoritative. */
export function applyAiSuggestion(
  current: BudgetLine[],
  suggestions: Array<{ category: string; deltaPct: number }>,
  distributable: number,
): RebalanceResult {
  if (
    suggestions.some(
      (s) =>
        !Number.isFinite(s.deltaPct) ||
        !current.some((l) => l.category === s.category),
    )
  )
    return { ok: false, error: "Invalid AI suggestion" };
  return distribute(
    current.map((l) => {
      const delta = suggestions
        .filter((s) => s.category === l.category)
        .reduce((n, s) => n + s.deltaPct, 0);
      return l.locked || delta === 0
        ? l
        : {
            ...l,
            allocatedAmount:
              (Math.max(l.minPct, Math.min(l.maxPct, l.pct + delta)) *
                distributable) /
              100,
          };
    }),
    distributable,
  );
}
export function validateBudget(budget: Budget): string[] {
  const errors: string[] = [];
  if (
    !Number.isSafeInteger(budget.total) ||
    budget.total <= 0 ||
    !Number.isFinite(budget.perGuestCost)
  )
    errors.push("Invalid budget total or per-guest cost");
  if (
    budget.contingencyPct < 5 ||
    budget.contingencyPct > 20 ||
    !Number.isFinite(budget.contingencyPct)
  )
    errors.push("Invalid contingency percentage");
  if (
    budget.contingencyAmount !==
    Math.round((budget.total * budget.contingencyPct) / 100)
  )
    errors.push("Contingency amount does not match its percentage");
  const lineSum = budget.lines.reduce((s, l) => s + l.allocatedAmount, 0);
  const expectedDistributable = budget.total - budget.contingencyAmount;
  if (lineSum !== expectedDistributable) {
    errors.push(
      `Budget sum mismatch: lines total ${lineSum} but distributable is ${expectedDistributable}`,
    );
  }
  for (const l of budget.lines) {
    if (!Number.isSafeInteger(l.allocatedAmount) || !Number.isFinite(l.pct))
      errors.push(`Invalid numeric allocation: ${l.label}`);
    if (l.allocatedAmount < 0) {
      errors.push(`Negative amount for ${l.label}: ${l.allocatedAmount}`);
    }
  }
  for (const l of budget.lines) {
    if (l.pct < l.minPct - 0.000001 || l.pct > l.maxPct + 0.000001) {
      errors.push(
        `${l.label} at ${l.pct.toFixed(1)}% is outside bounds [${l.minPct}%, ${l.maxPct}%]`,
      );
    }
  }
  if (budget.contingencyAmount < 0) {
    errors.push("Negative contingency amount");
  }
  if (budget.contingencyAmount + lineSum !== budget.total) {
    errors.push(
      `Total mismatch: contingency(${budget.contingencyAmount}) + lines(${lineSum}) !== total(${budget.total})`,
    );
  }
  return errors;
}
