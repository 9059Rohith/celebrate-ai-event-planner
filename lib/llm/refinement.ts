import { z } from "zod";
import { PlanSchema, type Plan } from "@/lib/schemas";
import { validateBudget } from "@/lib/domain/budgetEngine";

const id = z.string().min(1);
const note = z.string().max(500);
export const SectionRefinementSchema = z.discriminatedUnion("section", [
  z.strictObject({
    section: z.literal("budget"),
    changes: z
      .array(
        z.strictObject({
          id,
          allocatedAmount: z.number().int().min(0).optional(),
          pct: z.number().min(0).max(100).optional(),
          notes: note.optional(),
        }),
      )
      .max(100),
  }),
  z.strictObject({
    section: z.literal("timeline"),
    changes: z.array(z.strictObject({ id, notes: note.optional() })).max(100),
  }),
  z.strictObject({
    section: z.literal("vendors"),
    changes: z
      .array(
        z.strictObject({
          id,
          why: note.optional(),
          questionsToAdd: z.array(z.string().max(300)).max(3).optional(),
        }),
      )
      .max(50),
  }),
  z.strictObject({
    section: z.literal("ideas"),
    changes: z
      .array(
        z.strictObject({
          id,
          title: z.string().max(100).optional(),
          description: z.string().max(800).optional(),
          whyItFits: note.optional(),
        }),
      )
      .max(100),
  }),
]);
export type SectionRefinement = z.infer<typeof SectionRefinementSchema>;
export type RefinableSection = SectionRefinement["section"];

function changedFields<T extends { id: string }, K extends keyof T>(
  before: T[],
  after: T[],
  keys: readonly K[],
): Array<{ id: string } & Partial<Pick<T, K>>> {
  const originals = new Map(before.map((row) => [row.id, row]));
  return after.flatMap((row) => {
    const previous = originals.get(row.id);
    if (!previous) throw new Error("Refinement contains an unknown item");
    const patch: Partial<Pick<T, K>> = {};
    for (const key of keys)
      if (JSON.stringify(row[key]) !== JSON.stringify(previous[key]))
        patch[key] = row[key];
    return Object.keys(patch).length ? [{ id: row.id, ...patch }] : [];
  });
}

/** Compare the AI context before/after enhancement, never return its lossy rows as replacements. */
export function createSectionRefinement(
  section: RefinableSection,
  before: Plan,
  after: Plan,
): SectionRefinement {
  switch (section) {
    case "budget":
      return SectionRefinementSchema.parse({
        section,
        changes: changedFields(before.budget.lines, after.budget.lines, [
          "allocatedAmount",
          "pct",
          "notes",
        ]),
      });
    case "timeline":
      return SectionRefinementSchema.parse({
        section,
        changes: changedFields(
          before.timeline.milestones,
          after.timeline.milestones,
          ["notes"],
        ),
      });
    case "ideas":
      return SectionRefinementSchema.parse({
        section,
        changes: changedFields(before.ideas, after.ideas, [
          "title",
          "description",
          "whyItFits",
        ]),
      });
    case "vendors": {
      const changes = changedFields(before.vendors, after.vendors, [
        "why",
        "questionsToAsk",
      ]);
      return SectionRefinementSchema.parse({
        section,
        changes: changes.map(({ id, why, questionsToAsk }) => ({
          id,
          why,
          questionsToAdd: questionsToAsk?.filter(
            (q) =>
              !before.vendors
                .find((v) => v.id === id)!
                .questionsToAsk.includes(q),
          ),
        })),
      });
    }
  }
}

function applyChanges<T extends { id: string }>(
  rows: T[],
  changes: Array<{ id: string } & Partial<T>>,
): T[] {
  const ids = new Set(rows.map((row) => row.id));
  const updates = new Map(changes.map((change) => [change.id, change]));
  if (
    updates.size !== changes.length ||
    changes.some((change) => !ids.has(change.id))
  )
    throw new Error("Refinement contains duplicate or unknown items");
  return rows.map((row) => ({ ...row, ...updates.get(row.id) }));
}

/** Apply only allowed AI fields to the full client plan, retaining operational state and omitted rows. */
export function applySectionRefinement(
  plan: Plan,
  raw: unknown,
  section: RefinableSection,
): Plan {
  const refinement = SectionRefinementSchema.parse(raw);
  if (refinement.section !== section)
    throw new Error("Unexpected refinement section");
  const next = { ...plan };
  switch (refinement.section) {
    case "budget": {
      const lines = applyChanges(plan.budget.lines, refinement.changes);
      const budget = { ...plan.budget, lines };
      const distributable = budget.total - budget.contingencyAmount;
      if (
        validateBudget(budget).length ||
        budget.total !== plan.input.totalBudget ||
        budget.currency !== plan.input.currency ||
        lines.some(
          (line) =>
            Math.abs(line.pct - (line.allocatedAmount / distributable) * 100) >
            1e-6,
        ) ||
        plan.budget.lines.some(
          (line, i) =>
            line.locked && lines[i].allocatedAmount !== line.allocatedAmount,
        )
      )
        throw new Error(
          "Suggestion could not preserve budget constraints and locked amounts.",
        );
      next.budget = budget;
      break;
    }
    case "timeline":
      next.timeline = {
        ...plan.timeline,
        milestones: applyChanges(plan.timeline.milestones, refinement.changes),
      };
      break;
    case "ideas":
      next.ideas = applyChanges(plan.ideas, refinement.changes);
      break;
    case "vendors": {
      const changes = refinement.changes.map(({ id, why, questionsToAdd }) => {
        const current = plan.vendors.find((vendor) => vendor.id === id);
        return {
          id,
          ...(why === undefined ? {} : { why }),
          ...(questionsToAdd === undefined
            ? {}
            : {
                questionsToAsk: [
                  ...new Set([
                    ...(current?.questionsToAsk ?? []),
                    ...questionsToAdd,
                  ]),
                ],
              }),
        };
      });
      next.vendors = applyChanges(plan.vendors, changes);
      break;
    }
  }
  return PlanSchema.parse(next);
}
