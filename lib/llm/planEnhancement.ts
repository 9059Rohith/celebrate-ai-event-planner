import { z } from "zod";
import { PlanMetaSchema, PlanSchema, type Plan } from "@/lib/schemas";
import {
  applySectionRefinement,
  createSectionRefinement,
  SectionRefinementSchema,
} from "./refinement";

export const PlanEnhancementSchema = z.strictObject({
  summary: z.strictObject({
    oneParagraphVision: z.string().max(2000).optional(),
    keyRisksToAdd: z.array(z.string().max(300)).max(5).optional(),
    assumptionsToAdd: z.array(z.string().max(300)).max(5).optional(),
  }),
  sections: z
    .array(SectionRefinementSchema)
    .length(4)
    .refine(
      (sections) =>
        new Set(sections.map((section) => section.section)).size === 4 &&
        sections.every(
          (section) =>
            section.section !== "budget" ||
            section.changes.every(
              (change) =>
                change.allocatedAmount === undefined &&
                change.pct === undefined,
            ),
        ),
      "Enhancement must contain each section once and cannot change allocations.",
    ),
  meta: PlanMetaSchema,
});
export type PlanEnhancement = z.infer<typeof PlanEnhancementSchema>;

/** Compare bounded provider context; never replace the full saved plan with it. */
export function createPlanEnhancement(
  before: Plan,
  after: Plan,
): PlanEnhancement {
  const risks = after.summary.keyRisks.filter(
    (risk) => !before.summary.keyRisks.includes(risk),
  );
  const assumptions = after.summary.assumptions.filter(
    (item) => !before.summary.assumptions.includes(item),
  );
  return PlanEnhancementSchema.parse({
    summary: {
      ...(before.summary.oneParagraphVision === after.summary.oneParagraphVision
        ? {}
        : { oneParagraphVision: after.summary.oneParagraphVision }),
      ...(risks.length ? { keyRisksToAdd: risks } : {}),
      ...(assumptions.length ? { assumptionsToAdd: assumptions } : {}),
    },
    sections: (["budget", "timeline", "vendors", "ideas"] as const).map(
      (section) => createSectionRefinement(section, before, after),
    ),
    meta: after.meta,
  });
}

/** Validate every patch before the caller publishes the resulting plan. */
export function applyPlanEnhancement(plan: Plan, raw: unknown): Plan {
  const data = PlanEnhancementSchema.parse(raw);
  let next = plan;
  for (const section of data.sections)
    next = applySectionRefinement(next, section, section.section);
  return PlanSchema.parse({
    ...next,
    summary: {
      ...plan.summary,
      oneParagraphVision:
        data.summary.oneParagraphVision ?? plan.summary.oneParagraphVision,
      keyRisks: [
        ...new Set([
          ...plan.summary.keyRisks,
          ...(data.summary.keyRisksToAdd ?? []),
        ]),
      ].slice(0, 5),
      assumptions: [
        ...new Set([
          ...plan.summary.assumptions,
          ...(data.summary.assumptionsToAdd ?? []),
        ]),
      ],
    },
    meta: data.meta,
  });
}
