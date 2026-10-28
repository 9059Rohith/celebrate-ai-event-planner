import { z } from "zod";
import {
  PlanSchema,
  EventInputSchema,
  BudgetSchema,
  IdeaSchema,
  MilestoneSchema,
  type Plan,
} from "@/lib/schemas";
import { createPlan } from "@/lib/domain/planner";
const CompactIdea = IdeaSchema.pick({
  id: true,
  title: true,
  kind: true,
  tags: true,
  estCost: true,
});
export const SnapshotSchema = z
  .object({
    snapshot: z.literal(true),
    input: EventInputSchema,
    budget: BudgetSchema,
    milestones: z.array(MilestoneSchema).max(100),
    ideas: z.array(CompactIdea).max(100),
    vendors: z
      .array(
        z
          .object({
            id: z.string(),
            category: z.string(),
            status: z.enum([
              "not-started",
              "researching",
              "contacted",
              "booked",
              "confirmed",
            ]),
          })
          .strict(),
      )
      .max(50)
      .optional(),
  })
  .strict();
export const TransportPlanSchema = z.union([PlanSchema, SnapshotSchema]);
export type PlanSnapshot = z.infer<typeof SnapshotSchema>;
export { compactPlanSnapshot } from "@/lib/client/planSnapshot";
/** Reconstruct bounded AI context only. Refinements must be merged into the full client plan. */
export function hydratePlan(value: z.infer<typeof TransportPlanSchema>): Plan {
  if (!("snapshot" in value)) return value;
  const plan = createPlan(value.input);
  plan.budget = value.budget;
  plan.timeline.milestones = value.milestones;
  if (value.vendors)
    plan.vendors = value.vendors.map((v) => ({
      ...(plan.vendors.find((current) => current.category === v.category) || {
        why: "Custom vendor category",
        bookLeadWeeks: 0,
        estPriceRange: { min: 0, max: 0, unit: "request quotes" },
        checklist: [],
        questionsToAsk: [],
        redFlags: [],
        contractMustHaves: [],
      }),
      ...v,
    }));
  plan.ideas = value.ideas.map((idea) => ({
    ...idea,
    description: "",
    whyItFits: "",
    effort: "low",
    saved: false,
  }));
  return plan;
}
