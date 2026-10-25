import { z } from "zod";

// The dashboard consumes a summary, not the full evaluation harness output.
// Evidence is optional because static snapshots load it on demand.
const CaseSummarySchema = z.object({
  id: z.string(),
  passed: z.boolean(),
  latencyMs: z.number().nonnegative(),
  tokensIn: z.number().nonnegative(),
  tokensOut: z.number().nonnegative(),
  checks: z.record(
    z.string(),
    z.object({ passed: z.boolean(), rationale: z.string() }),
  ),
  error: z.string().optional(),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  judge: z
    .object({
      first: z.object({ rationale: z.string() }),
      second: z.object({ rationale: z.string() }),
    })
    .optional(),
});

export const EvaluationSummarySchema = z.object({
  id: z.string(),
  timestamp: z.iso.datetime(),
  mode: z.string(),
  promptVersion: z.string(),
  model: z.string(),
  gitSha: z.string(),
  totalCases: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  completed: z.boolean(),
  p50LatencyMs: z.number().nonnegative(),
  p95LatencyMs: z.number().nonnegative(),
  tokens: z.number().nonnegative(),
  costUsd: z.number().nonnegative().nullable(),
  judgeStatus: z.string(),
  metricRates: z.record(z.string(), z.number().min(0).max(1)),
  thresholds: z.record(z.string(), z.boolean()),
  structuredValidation: z
    .object({
      observedCases: z.number().int().nonnegative(),
      firstAttemptValidRate: z.number().min(0).max(1).nullable(),
      validAfterRepairRate: z.number().min(0).max(1).nullable(),
      repairAttempts: z.number().int().nonnegative(),
      repairSuccesses: z.number().int().nonnegative(),
    })
    .optional(),
  results: z.array(CaseSummarySchema),
});

export type EvaluationSummary = z.infer<typeof EvaluationSummarySchema>;
