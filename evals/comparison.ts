import { writeFileSync } from "node:fs";
import type { Options } from "./harness";
import { goldenCases } from "./dataset";
import { pairwise, price } from "./judge";
/** Live blinded, randomized and position-swapped A/B comparison; offline never invents winners. */
export async function comparePrompts(options: Options, out: string) {
  if (options.mock) {
    const result = {
      timestamp: new Date().toISOString(),
      status: "not-run",
      reason:
        "Offline deterministic output cannot establish prompt preference. No pairwise winners fabricated.",
    };
    writeFileSync(out, JSON.stringify(result, null, 2));
    return result;
  }
  const judgeModel = process.env.OPENAI_JUDGE_MODEL || "gpt-4o";
  if (!process.env.OPENAI_API_KEY || price(judgeModel, 1, 1) === null)
    throw new Error(
      "Live pairwise comparison requires a key and known judge pricing.",
    );
  const { generatePlan } = await import("@/lib/llm/generatePlan");
  const results = [];
  let reserved = 0;
  for (const test of goldenCases().slice(0, options.limit)) {
    if (reserved + 0.7 > options.maxUsd) break;
    reserved += 0.7;
    const a = await generatePlan(test.input, { promptVersion: "v1" });
    const b = await generatePlan(test.input, { promptVersion: "v2" });
    const judgement = await pairwise(test, a, b, judgeModel);
    results.push({
      id: test.id,
      sources: [a.meta.source, b.meta.source],
      judgement,
    });
    writeFileSync(
      out,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          status: "live",
          results,
          estimatedJudgeCostUsd: results.reduce(
            (s, r) => s + (r.judgement.estimatedCostUsd || 0),
            0,
          ),
          reservedMaximumUsd: reserved,
        },
        null,
        2,
      ),
    );
  }
  return {
    completed: results.length,
    total: Math.min(options.limit, goldenCases().length),
  };
}
