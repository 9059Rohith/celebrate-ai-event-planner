import { createPlan } from "@/lib/domain/planner";

import type { EventInput, Plan } from "@/lib/schemas";
import { evaluate, metricNames, type Check } from "./metrics";
import { goldenCases } from "./dataset";
import { judgePlan, price, rubricKeys } from "./judge";
export type Options = {
  suite: "all" | "deterministic" | "judge" | "adversarial";
  mock: boolean;
  limit: number;
  model: string;
  concurrency: number;
  maxUsd: number;
  promptVersion: "v1" | "v2";
  signal?: AbortSignal;
};
export type CaseResult = {
  id: string;
  input: EventInput;
  tags: string[];
  output?: Plan;
  checks: Record<string, Check>;
  passed: boolean;
  latencyMs: number;
  ttfbMs: null;
  skeletonMs: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number | null;
  judge?: Awaited<ReturnType<typeof judgePlan>>;
  error?: string;
};
export type Run = {
  id: string;
  timestamp: string;
  mode: string;
  promptVersion: string;
  model: string;
  gitSha: string;
  totalCases: number;
  passed: number;
  failed: number;
  completed: boolean;
  stopReason?: string;
  durationMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  tokens: number;
  costUsd: number | null;
  judgeStatus: string;
  metricRates: Record<string, number>;
  thresholds: Record<string, boolean>;
  results: CaseResult[];
};
export function summarize(
  results: CaseResult[],
  options: Options,
  started: number,
  complete: boolean,
  stopReason?: string,
): Run {
  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const percentile = (p: number) =>
    latencies[Math.max(0, Math.ceil(latencies.length * p) - 1)] || 0;
  const rates = Object.fromEntries(
    metricNames.map((k) => [
      k,
      results.length
        ? results.filter((r) => r.checks[k]?.passed).length / results.length
        : 0,
    ]),
  );
  const judged = results.flatMap((r) => (r.judge ? [r.judge] : []));
  const judgeMeans = Object.fromEntries(
    rubricKeys.map((k) => [
      k,
      judged.length
        ? judged.reduce(
            (s, j) => s + (j.first.scores[k] + j.second.scores[k]) / 2,
            0,
          ) / judged.length
        : 0,
    ]),
  );
  const thresholds = {
    schema: rates.schemaValid >= 0.98,
    budget: rates.budgetIntegrity === 1,
    timeline: rates.timelineValid === 1,
    diet: rates.dietaryCompliance === 1,
    injection: rates.safetyPass === 1,
    constraints: rates.constraintAdherence === 1,
    hallucinations: rates.hallucinationFree === 1,
    fallback: rates.fallbackValid === 1,
    latency: options.mock || percentile(0.95) <= 12000,
    judge: !judged.length
      ? options.mock ||
        options.suite === "deterministic" ||
        options.suite === "adversarial"
      : Object.values(judgeMeans).every((v) => v >= 3.5) &&
        Object.values(judgeMeans).reduce((a, b) => a + b, 0) / 7 >= 4,
  };
  return {
    id: `${options.promptVersion}-${new Date(started).toISOString()}`,
    timestamp: new Date().toISOString(),
    mode: options.mock
      ? "Offline deterministic engine (no model calls)"
      : "Live generation; fallback source recorded per case",
    promptVersion: options.promptVersion,
    model: options.mock ? "none" : options.model,
    gitSha: process.env.EVAL_GIT_SHA || "unknown",
    totalCases: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    completed: complete,
    stopReason,
    durationMs: Date.now() - started,
    p50LatencyMs: percentile(0.5),
    p95LatencyMs: percentile(0.95),
    tokens: results.reduce(
      (s, r) =>
        s +
        r.tokensIn +
        r.tokensOut +
        (r.judge?.tokensIn || 0) +
        (r.judge?.tokensOut || 0),
      0,
    ),
    costUsd: results.some((r) => r.costUsd === null)
      ? null
      : results.reduce(
          (s, r) => s + (r.costUsd || 0) + (r.judge?.estimatedCostUsd || 0),
          0,
        ),
    judgeStatus: judged.length
      ? `${judged.length} outputs judged twice; agreement ±1: ${((judged.reduce((s, j) => s + j.agreement, 0) / judged.length) * 100).toFixed(1)}%; means ${JSON.stringify(judgeMeans)}`
      : "Not run. No live judge scores or calibration agreement available.",
    metricRates: rates,
    thresholds,
    results,
  };
}
export async function runEvaluation(
  options: Options,
  previous: CaseResult[] = [],
  onProgress?: (run: Run) => void,
): Promise<Run> {
  if (!options.mock && !process.env.OPENAI_API_KEY)
    throw new Error(
      "Live evaluation requires OPENAI_API_KEY. Use --mock for an honest offline run.",
    );
  if (
    !options.mock &&
    (options.suite === "all" || options.suite === "judge") &&
    price(process.env.OPENAI_JUDGE_MODEL || "gpt-4o", 1, 1) === null
  )
    throw new Error(
      "Unknown judge pricing: add a documented price before cost-capped live evaluation.",
    );
  if (!options.mock && price(options.model, 1, 1) === null)
    throw new Error(
      "Unknown model pricing: add a documented price before cost-capped live evaluation.",
    );
  const started = Date.now();
  const tests = goldenCases()
    .filter(
      (c) => options.suite !== "adversarial" || c.tags.includes("adversarial"),
    )
    .slice(0, options.limit);
  const results = [...previous.filter((r) => tests.some((t) => t.id === r.id))];
  const queue = tests.filter((t) => !results.some((r) => r.id === t.id));
  let next = 0;
  let reserved = results.reduce(
    (s, r) => s + (r.costUsd || 0) + (r.judge?.estimatedCostUsd || 0),
    0,
  );
  let stopped: string | undefined;
  // Reserve a deliberately conservative upper bound before dispatch; no new calls once cap would be crossed.
  const reservation = options.mock
    ? 0
    : options.suite === "all" || options.suite === "judge"
      ? 0.6
      : 0.15;
  async function worker() {
    while (next < queue.length && !options.signal?.aborted) {
      if (reserved + reservation > options.maxUsd) {
        stopped =
          "Cost cap reservation reached; resume with a higher --max-usd.";
        return;
      }
      const test = queue[next++];
      reserved += reservation;
      const start = performance.now();
      let result: CaseResult;
      try {
        const skeletonStart = performance.now();
        const skeleton = createPlan(test.input);
        const skeletonMs = performance.now() - skeletonStart;
        const generator = options.mock
          ? null
          : ((await import("@/lib/llm/generatePlan")).generatePlan as (
              input: EventInput,
              options?: { signal?: AbortSignal; promptVersion?: "v1" | "v2" },
            ) => Promise<Plan>);
        const output = options.mock
          ? skeleton
          : await generator!(test.input, {
              signal: options.signal,
              promptVersion: options.promptVersion,
            });
        const latencyMs = performance.now() - start;
        const checks = evaluate(test, output);
        const tokensIn = output.meta.tokens?.in || 0;
        const tokensOut = output.meta.tokens?.out || 0;
        const judge =
          !options.mock &&
          (options.suite === "all" || options.suite === "judge")
            ? await judgePlan(
                test,
                output,
                process.env.OPENAI_JUDGE_MODEL || "gpt-4o",
                options.signal,
              )
            : undefined;
        result = {
          id: test.id,
          input: test.input,
          tags: test.tags,
          output,
          checks,
          passed: Object.values(checks).every((c) => c.passed),
          latencyMs,
          ttfbMs: null,
          skeletonMs,
          tokensIn,
          tokensOut,
          costUsd: options.mock ? 0 : price(options.model, tokensIn, tokensOut),
          judge,
        };
      } catch {
        result = {
          id: test.id,
          input: test.input,
          tags: test.tags,
          checks: {
            generation: {
              passed: false,
              rationale: "Generation or judging failed.",
            },
          },
          passed: false,
          latencyMs: performance.now() - start,
          ttfbMs: null,
          skeletonMs: 0,
          tokensIn: 0,
          tokensOut: 0,
          costUsd: options.mock ? 0 : null,
          error:
            "Generation or judge failed; inspect server configuration and retry.",
        };
      }
      results.push(result);
      onProgress?.(summarize(results, options, started, false));
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(options.concurrency, queue.length) }, worker),
  );
  return summarize(
    results,
    options,
    started,
    results.length === tests.length,
    stopped || (options.signal?.aborted ? "Aborted" : undefined),
  );
}
