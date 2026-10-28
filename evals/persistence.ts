import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { EventInputSchema, PlanSchema } from "@/lib/schemas";
import { EvaluationSummarySchema } from "@/lib/schemas/evaluation";
import { goldenCases } from "./dataset";
import { JudgementSchema } from "./judge";
import type { Options, Run } from "./harness";

const ConfigurationSchema = z.object({
  version: z.literal(1),
  suite: z.enum(["all", "deterministic", "judge", "adversarial"]),
  mock: z.boolean(),
  model: z.string(),
  promptVersion: z.enum(["v1", "v2"]),
  judgeModel: z.string().nullable(),
  datasetHash: z.string().regex(/^[a-f0-9]{64}$/),
});
export type EvaluationConfiguration = z.infer<typeof ConfigurationSchema>;

export function selectedCases(options: Pick<Options, "suite" | "limit">) {
  return goldenCases()
    .filter(
      (test) =>
        options.suite !== "adversarial" || test.tags.includes("adversarial"),
    )
    .slice(0, options.limit);
}

export function evaluationConfiguration(
  options: Options,
): EvaluationConfiguration {
  return {
    version: 1,
    suite: options.suite,
    mock: options.mock,
    model: options.mock ? "none" : options.model,
    promptVersion: options.promptVersion,
    judgeModel:
      !options.mock && (options.suite === "all" || options.suite === "judge")
        ? process.env.OPENAI_JUDGE_MODEL || "gpt-4o"
        : null,
    datasetHash: createHash("sha256")
      .update(JSON.stringify(selectedCases(options)))
      .digest("hex"),
  };
}

const CaseResultSchema = z.object({
  id: z.string(),
  input: EventInputSchema,
  tags: z.array(z.string()),
  output: PlanSchema.optional(),
  checks: z.record(
    z.string(),
    z.object({ passed: z.boolean(), rationale: z.string() }),
  ),
  passed: z.boolean(),
  latencyMs: z.number().nonnegative(),
  ttfbMs: z.null(),
  skeletonMs: z.number().nonnegative(),
  tokensIn: z.number().int().nonnegative(),
  tokensOut: z.number().int().nonnegative(),
  costUsd: z.number().nonnegative().nullable(),
  judge: z
    .object({
      first: JudgementSchema,
      second: JudgementSchema,
      agreement: z.number().min(0).max(1),
      tokensIn: z.number().int().nonnegative(),
      tokensOut: z.number().int().nonnegative(),
      estimatedCostUsd: z.number().nonnegative().nullable(),
    })
    .optional(),
  error: z.string().optional(),
});
const EvaluationRunSchema = EvaluationSummarySchema.extend({
  configuration: ConfigurationSchema.optional(),
  durationMs: z.number().nonnegative(),
  stopReason: z.string().optional(),
  results: z.array(CaseResultSchema),
}).refine(
  (run) =>
    run.totalCases === run.results.length &&
    run.passed + run.failed === run.totalCases,
  "Case counts do not match the saved results.",
);

export function parseEvaluationRun(value: unknown): Run {
  return EvaluationRunSchema.parse(value);
}

export function parseResume(value: unknown, options: Options): Run {
  const parsed = EvaluationRunSchema.safeParse(value);
  if (!parsed.success)
    throw new Error("Invalid resume evidence. Use a fresh output path.");
  const expected = evaluationConfiguration(options);
  if (
    !isDeepStrictEqual(parsed.data.configuration, expected) ||
    parsed.data.model !== expected.model ||
    parsed.data.promptVersion !== expected.promptVersion ||
    parsed.data.gitSha !== (process.env.EVAL_GIT_SHA || "unknown")
  )
    throw new Error(
      "Resume configuration, dataset or code revision mismatch. Use a fresh output path.",
    );
  return parsed.data;
}
