import { z } from "zod";
import { EventInputSchema } from "./event";

// ─── Budget schemas ───────────────────────────────────────────────
export const EstimateConfidenceEnum = z.enum(["low", "medium", "high"]);

export const BudgetLineSchema = z.strictObject({
  id: z.string(),
  category: z.string(),
  label: z.string(),
  allocatedAmount: z.number().min(0),
  pct: z.number().min(0).max(100),
  minPct: z.number().min(0).max(100),
  maxPct: z.number().min(0).max(100),
  locked: z.boolean().default(false),
  notes: z.string().default(""),
  estimateConfidence: EstimateConfidenceEnum.default("medium"),
});
export type BudgetLine = z.infer<typeof BudgetLineSchema>;

export const BudgetSchema = z.strictObject({
  currency: z.string(),
  total: z.number().positive(),
  contingencyPct: z.number().min(0).max(30),
  contingencyAmount: z.number().min(0),
  lines: z.array(BudgetLineSchema),
  perGuestCost: z.number().min(0),
  warnings: z.array(z.string()).default([]),
});
export type Budget = z.infer<typeof BudgetSchema>;

// ─── Timeline schemas ─────────────────────────────────────────────
export const MilestonePriorityEnum = z.enum(["must", "should", "nice"]);
export const MilestoneStatusEnum = z.enum(["todo", "doing", "done"]);

export const MilestoneSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  dueOffsetDays: z.number().int(), // negative = before event
  dueDate: z.string().nullable().default(null),
  category: z.string(),
  priority: MilestonePriorityEnum.default("should"),
  status: MilestoneStatusEnum.default("todo"),
  dependsOn: z.array(z.string()).default([]),
  notes: z.string().default(""),
});
export type Milestone = z.infer<typeof MilestoneSchema>;

export const ScheduleItemSchema = z.strictObject({
  id: z.string(),
  startTime: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  durationMin: z.number().int().positive().max(1440),
  day: z.number().int().min(1).max(5).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  title: z.string(),
  owner: z.string().optional(),
  notes: z.string().default(""),
});
export type ScheduleItem = z.infer<typeof ScheduleItemSchema>;

export const TimelineSchema = z.strictObject({
  eventDate: z.string().nullable().default(null),
  milestones: z.array(MilestoneSchema),
  dayOf: z.array(ScheduleItemSchema),
});
export type Timeline = z.infer<typeof TimelineSchema>;

// ─── Vendor schemas ───────────────────────────────────────────────
export const ChecklistItemSchema = z.strictObject({
  id: z.string(),
  text: z.string(),
  done: z.boolean().default(false),
  critical: z.boolean().default(false),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const VendorCategoryStatusEnum = z.enum([
  "not-started",
  "researching",
  "contacted",
  "booked",
  "confirmed",
]);

export const VendorCategorySchema = z.strictObject({
  id: z.string(),
  category: z.string(),
  why: z.string(),
  bookLeadWeeks: z.number().int().min(0),
  estPriceRange: z.strictObject({
    min: z.number().min(0),
    max: z.number().min(0),
    unit: z.string().default("total"),
  }),
  checklist: z.array(ChecklistItemSchema),
  questionsToAsk: z.array(z.string()),
  redFlags: z.array(z.string()),
  contractMustHaves: z.array(z.string()),
  status: VendorCategoryStatusEnum.default("not-started"),
});
export type VendorCategory = z.infer<typeof VendorCategorySchema>;

// ─── Ideas schemas ────────────────────────────────────────────────
export const IdeaKindEnum = z.enum([
  "theme",
  "menu",
  "activity",
  "decor",
  "entertainment",
  "favor",
  "invitation",
  "photo",
  "sustainability",
  "accessibility",
]);

export const EffortEnum = z.enum(["low", "medium", "high"]);

export const IdeaSchema = z.strictObject({
  id: z.string(),
  kind: IdeaKindEnum,
  title: z.string(),
  description: z.string(),
  whyItFits: z.string(),
  estCost: z.strictObject({
    min: z.number().min(0),
    max: z.number().min(0),
  }),
  effort: EffortEnum,
  tags: z.array(z.string()).default([]),
  saved: z.boolean().default(false),
});
export type Idea = z.infer<typeof IdeaSchema>;

// ─── Plan Summary ─────────────────────────────────────────────────
export const PlanSummarySchema = z.strictObject({
  headline: z.string(),
  oneParagraphVision: z.string(),
  keyRisks: z.array(z.string()).max(5),
  assumptions: z.array(z.string()),
});
export type PlanSummary = z.infer<typeof PlanSummarySchema>;

// ─── Plan Meta ────────────────────────────────────────────────────
export const PlanMetaSchema = z.strictObject({
  source: z.enum(["ai", "fallback", "hybrid"]),
  model: z.string().optional(),
  promptVersion: z.string(),
  tokens: z
    .strictObject({
      in: z.number().int(),
      out: z.number().int(),
    })
    .optional(),
  latencyMs: z.number().optional(),
  cached: z.boolean().optional(),
});
export type PlanMeta = z.infer<typeof PlanMetaSchema>;

// ─── Full Plan ────────────────────────────────────────────────────
export const PlanSchema = z.strictObject({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int().default(1),
  input: EventInputSchema,
  summary: PlanSummarySchema,
  budget: BudgetSchema,
  timeline: TimelineSchema,
  vendors: z.array(VendorCategorySchema),
  ideas: z.array(IdeaSchema),
  meta: PlanMetaSchema,
});
export type Plan = z.infer<typeof PlanSchema>;

// ─── Chat schemas ─────────────────────────────────────────────────
export const ChatMessageRoleEnum = z.enum([
  "user",
  "assistant",
  "system",
  "tool",
]);

export const ToolCallSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()),
  result: z.unknown().optional(),
  status: z
    .enum(["pending", "accepted", "rejected", "undone"])
    .default("pending"),
});
export type ToolCall = z.infer<typeof ToolCallSchema>;

export const ChatMessageSchema = z.strictObject({
  id: z.string(),
  role: ChatMessageRoleEnum,
  content: z.string(),
  timestamp: z.string(),
  toolCalls: z.array(ToolCallSchema).optional(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// ─── Eval schemas ─────────────────────────────────────────────────
export const EvalCaseSchema = z.strictObject({
  id: z.string(),
  input: EventInputSchema,
  tags: z.array(z.string()),
  expectations: z.strictObject({
    mustMention: z.array(z.string()).optional(),
    mustNotMention: z.array(z.string()).optional(),
    budgetFeasible: z.boolean(),
    expectedWarnings: z.array(z.string()).optional(),
    expectedRefusalOrSafeHandling: z.boolean().optional(),
  }),
});
export type EvalCase = z.infer<typeof EvalCaseSchema>;

export const EvalResultSchema = z.strictObject({
  caseId: z.string(),
  passed: z.boolean(),
  metrics: z.strictObject({
    schemaValid: z.boolean(),
    schemaValidAfterRepair: z.boolean().optional(),
    budgetIntegrity: z.boolean(),
    timelineValid: z.boolean(),
    dietaryCompliance: z.boolean(),
    constraintAdherence: z.number().min(0).max(1),
    safetyPass: z.boolean(),
    hallucinationFree: z.boolean(),
    latencyMs: z.number(),
    tokensIn: z.number().int(),
    tokensOut: z.number().int(),
    estimatedCostUsd: z.number(),
  }),
  judgeScores: z
    .strictObject({
      personalization: z.number().min(1).max(5).optional(),
      actionability: z.number().min(1).max(5).optional(),
      budgetRealism: z.number().min(1).max(5).optional(),
      culturalSensitivity: z.number().min(1).max(5).optional(),
      completeness: z.number().min(1).max(5).optional(),
      creativity: z.number().min(1).max(5).optional(),
      safety: z.number().min(1).max(5).optional(),
    })
    .optional(),
  judgeRationale: z.string().optional(),
  error: z.string().optional(),
});
export type EvalResult = z.infer<typeof EvalResultSchema>;

export const EvalRunSchema = z.strictObject({
  id: z.string(),
  timestamp: z.string(),
  model: z.string(),
  promptVersion: z.string(),
  gitSha: z.string().optional(),
  totalCases: z.number().int(),
  passed: z.number().int(),
  failed: z.number().int(),
  results: z.array(EvalResultSchema),
  aggregates: z.strictObject({
    schemaValidityRate: z.number(),
    budgetIntegrityRate: z.number(),
    dietaryComplianceRate: z.number(),
    safetyPassRate: z.number(),
    avgLatencyMs: z.number(),
    p95LatencyMs: z.number(),
    avgTokensIn: z.number(),
    avgTokensOut: z.number(),
    avgCostUsd: z.number(),
    judgeAvg: z.record(z.string(), z.number()).optional(),
  }),
});
export type EvalRun = z.infer<typeof EvalRunSchema>;
