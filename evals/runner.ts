import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { runEvaluation, type Options, type Run } from "./harness";
import { goldenCases } from "./dataset";
import { comparePrompts } from "./comparison";
import { parseEvaluationRun, parseResume } from "./persistence";
const args = process.argv.slice(2);
const arg = (name: string, fallback: string) => {
  const index = args.findIndex(
    (a) => a === `--${name}` || a.startsWith(`--${name}=`),
  );
  return index < 0
    ? fallback
    : args[index].includes("=")
      ? args[index].slice(name.length + 3)
      : args[index + 1] || fallback;
};
async function main() {
  const suite = arg("suite", "all");
  if (!["all", "deterministic", "judge", "adversarial"].includes(suite))
    throw new Error("Invalid suite.");
  const options: Options = {
    suite: suite as Options["suite"],
    mock: args.includes("--mock"),
    limit: Number(arg("limit", "46")),
    model: arg("model", process.env.OPENAI_MODEL || "gpt-4o-mini"),
    concurrency: Number(arg("concurrency", "4")),
    maxUsd: Number(arg("max-usd", "2")),
    promptVersion: arg("prompt-version", "v2") as "v1" | "v2",
  };
  if (
    !Number.isInteger(options.limit) ||
    options.limit < 1 ||
    !Number.isInteger(options.concurrency) ||
    options.concurrency < 1 ||
    options.concurrency > 16 ||
    !Number.isFinite(options.maxUsd) ||
    options.maxUsd < 0 ||
    !["v1", "v2"].includes(options.promptVersion)
  )
    throw new Error("Invalid limit, concurrency, cost cap or prompt version.");
  process.env.OPENAI_MODEL = options.model;
  try {
    process.env.EVAL_GIT_SHA = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    process.env.EVAL_GIT_SHA = "uncommitted";
  }
  const out = arg("out", "evals/results/latest.json");
  mkdirSync(dirname(out), { recursive: true });
  mkdirSync("evals/datasets", { recursive: true });
  writeFileSync(
    "evals/datasets/golden.jsonl",
    goldenCases()
      .map((c) => JSON.stringify(c))
      .join("\n") + "\n",
  );
  if (args.includes("--pairwise")) {
    const comparison = await comparePrompts(options, out);
    process.stdout.write(JSON.stringify(comparison, null, 2) + "\n");
    if ("completed" in comparison && comparison.completed < comparison.total)
      process.exitCode = 1;
    return;
  }
  const previous =
    args.includes("--resume") && existsSync(out)
      ? parseResume(JSON.parse(readFileSync(out, "utf8")), options)
      : undefined;
  const save = (run: Run) => writeFileSync(out, JSON.stringify(run, null, 2));
  const run = await runEvaluation(options, previous?.results, save);
  save(run);
  const baseline = arg("compare", "");
  if (baseline) {
    const old = parseEvaluationRun(JSON.parse(readFileSync(baseline, "utf8")));
    const comparison = {
      baseline: old.id,
      candidate: run.id,
      mode: run.mode,
      metricDeltas: Object.fromEntries(
        Object.entries(run.metricRates).map(([k, v]) => [
          k,
          v - (old.metricRates[k] || 0),
        ]),
      ),
      passDelta: run.passed - old.passed,
      latencyDeltaMs: run.p95LatencyMs - old.p95LatencyMs,
      regressions: run.results
        .filter(
          (r) =>
            !r.passed && old.results.some((o) => o.id === r.id && o.passed),
        )
        .map((r) => r.id),
      note: options.mock
        ? "Both prompt versions use the same deterministic fallback. This does not establish a model prompt quality improvement."
        : "Absolute metric comparison; pairwise judging is available separately.",
    };
    writeFileSync(
      out.replace(/\.json$/, ".comparison.json"),
      JSON.stringify(comparison, null, 2),
    );
  }
  process.stdout.write(
    JSON.stringify({ ...run, results: undefined }, null, 2) + "\n",
  );
  if (!run.completed || Object.values(run.thresholds).some((v) => !v))
    process.exitCode = 1;
}
main().catch((error) => {
  process.stderr.write(
    (error instanceof Error ? error.message : "Evaluation failed") + "\n",
  );
  process.exitCode = 1;
});
