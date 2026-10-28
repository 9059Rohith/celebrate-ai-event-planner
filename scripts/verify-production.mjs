import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { inspectRelease, productionUrl } from "./lib/release-cache.mjs";
import {
  auditSpecifications,
  collectProductionVerification,
} from "./lib/production-verification.mjs";

const phase = process.env.PERF_PHASE || "release-cache";
if (!/^[a-zA-Z0-9_-]+$/.test(phase)) throw Error("Invalid audit phase");
const destination = `reports/verification-${phase}.json`;
const paths = [
  destination,
  ...auditSpecifications.map(({ report }) => `reports/${report}-${phase}.json`),
];
if (paths.some((path) => existsSync(path)))
  throw Error(
    "This audit phase already has evidence. Choose a new PERF_PHASE; existing samples will not be overwritten.",
  );
const summary = await collectProductionVerification({
  phase,
  base: productionUrl,
  deploymentId: process.env.DEPLOYMENT_ID,
  inspect: inspectRelease,
  readJson: (path) => JSON.parse(readFileSync(path, "utf8")),
  runAudit: (script) => {
    const result = spawnSync(process.execPath, [`scripts/${script}.mjs`], {
      stdio: "inherit",
      env: {
        ...process.env,
        PERF_PHASE: phase,
        TEST_BASE_URL: productionUrl,
        HYDRATION_URL: productionUrl,
      },
    });
    return { exitCode: result.status, error: result.error?.message };
  },
});
writeFileSync(destination, JSON.stringify(summary, null, 2));
console.log(
  JSON.stringify({
    ...summary,
    outliers: summary.outliers.map(
      ({ sample, path, kind, loadMs, readyMs }) => ({
        sample,
        path,
        kind,
        loadMs,
        readyMs,
      }),
    ),
    errors: summary.errors.length,
  }),
);
if (!summary.passed) process.exitCode = 1;
