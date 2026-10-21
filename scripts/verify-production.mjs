import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { inspectRelease, productionUrl } from "./lib/release-cache.mjs";

const phase = process.env.PERF_PHASE || "release-cache";
if (!/^[a-zA-Z0-9_-]+$/.test(phase)) throw Error("Invalid audit phase");
const warmup = JSON.parse(
  readFileSync("reports/deployment-warmup.json", "utf8"),
);
const before = await inspectRelease();
if (
  warmup.error ||
  warmup.fingerprint !== before.fingerprint ||
  warmup.verifiedAssets !== before.assets.length
) {
  throw Error(
    "Current production assets have not passed verified warmup; run scripts/warm-deployment.mjs first",
  );
}
const sources = [];
const commands = [];
for (const [script, report] of [
  ["full-load", "full-load"],
  ["workspace-load", "workspace-load"],
  ["hydration-check", "shared-hydration"],
]) {
  const result = spawnSync(process.execPath, [`scripts/${script}.mjs`], {
    stdio: "inherit",
    env: {
      ...process.env,
      PERF_PHASE: phase,
      TEST_BASE_URL: productionUrl,
      HYDRATION_URL: productionUrl,
    },
  });
  commands.push({
    script,
    exitCode: result.status,
    error: result.error?.message,
  });
  sources.push(`reports/${report}-${phase}.json`);
}
const after = await inspectRelease();
const reports = sources.map((source) => ({
  source,
  ...JSON.parse(readFileSync(source, "utf8")),
}));
const rows = reports.flatMap(({ source, results }) =>
  results.map((row) => ({ source, ...row })),
);
const loads = rows
  .map((row) => row.loadMs)
  .filter(Number.isFinite)
  .sort((a, b) => a - b);
const errors = rows.filter((row) => row.error || row.errors?.length);
const outliers = rows.filter(
  (row) =>
    !Number.isFinite(row.loadMs) || row.loadMs >= 2000 || row.readyMs >= 2000,
);
const stableRelease = before.fingerprint === after.fingerprint;
const passed =
  stableRelease &&
  rows.length === 68 &&
  !errors.length &&
  !outliers.length &&
  commands.every((command) => command.exitCode === 0);
const summary = {
  url: productionUrl,
  deploymentId: process.env.DEPLOYMENT_ID,
  timestamp: new Date().toISOString(),
  conditions:
    "Fresh browser contexts and browser caches, unthrottled network, desktop and iPhone13 emulation. Server/CDN assets verified warm before audit; release fingerprint checked before and after. Every sample retained, no retries.",
  browserChannel: reports[0].browserChannel,
  browserVersion: reports[0].browserVersion,
  fingerprint: before.fingerprint,
  stableRelease,
  verifiedAssets: warmup.verifiedAssets,
  samples: rows.length,
  underTwoSeconds: loads.filter((load) => load < 2000).length,
  medianLoadMs: loads[Math.floor(loads.length / 2)],
  p95LoadMs: loads[Math.ceil(loads.length * 0.95) - 1],
  maxLoadMs: Math.max(...loads),
  maxReadyMs: Math.max(...rows.map((row) => row.readyMs || 0)),
  errors,
  outliers,
  commands,
  sources,
  passed,
};
writeFileSync(
  `reports/verification-${phase}.json`,
  JSON.stringify(summary, null, 2),
);
console.log(
  JSON.stringify({
    ...summary,
    outliers: outliers.map((row) => ({
      sample: row.sample,
      path: row.path,
      kind: row.kind,
      loadMs: row.loadMs,
      readyMs: row.readyMs,
    })),
    errors: errors.length,
  }),
);
if (!passed) process.exitCode = 1;
