export const auditSpecifications = [
  { script: "full-load", report: "full-load", samples: 36 },
  { script: "workspace-load", report: "workspace-load", samples: 12 },
  { script: "hydration-check", report: "shared-hydration", samples: 20 },
];

/** Collect one audit without retries; infrastructure failures remain evidence. */
export async function collectProductionVerification({
  phase,
  base,
  deploymentId,
  inspect,
  runAudit,
  readJson,
}) {
  const verificationErrors = [];
  const recordFailure = (stage, error) => {
    verificationErrors.push({
      stage,
      message: error instanceof Error ? error.message : String(error),
    });
  };
  let warmup;
  let before;
  let after;
  let preflightPassed = false;
  try {
    warmup = readJson("reports/deployment-warmup.json");
    before = await inspect();
    if (
      warmup.error ||
      warmup.fingerprint !== before.fingerprint ||
      warmup.verifiedAssets !== before.assets.length
    )
      throw new Error(
        "Current production assets have not passed verified warmup; run scripts/warm-deployment.mjs first",
      );
    preflightPassed = true;
  } catch (error) {
    recordFailure("preflight", error);
  }
  const commands = [];
  const reports = [];
  const rows = [];
  if (preflightPassed) {
    for (const spec of auditSpecifications) {
      const source = `reports/${spec.report}-${phase}.json`;
      try {
        const result = await runAudit(spec.script);
        commands.push({ script: spec.script, ...result });
      } catch (error) {
        commands.push({ script: spec.script, exitCode: null });
        recordFailure(spec.script, error);
      }
      try {
        const report = readJson(source);
        if (!report || !Array.isArray(report.results))
          throw new Error("Audit report has no results array");
        reports.push({ ...report, source });
        if (report.results.length !== spec.samples)
          recordFailure(
            source,
            `Expected ${spec.samples} samples; received ${report.results.length}`,
          );
        for (const row of report.results) {
          if (!row || typeof row !== "object" || Array.isArray(row)) {
            recordFailure(source, "Audit report contains an invalid sample");
            continue;
          }
          rows.push({ ...row, source });
          if (spec.script !== "full-load" && !Number.isFinite(row.readyMs))
            recordFailure(
              source,
              "Workspace sample is missing heading readiness",
            );
        }
      } catch (error) {
        recordFailure(source, error);
      }
    }
    try {
      after = await inspect();
    } catch (error) {
      recordFailure("final-identity", error);
    }
  }
  const loads = rows
    .map((row) => row.loadMs)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const errors = rows.filter(
    (row) =>
      row.error ||
      row.errors?.length ||
      (row.status !== undefined && row.status !== 200),
  );
  const outliers = rows.filter(
    (row) =>
      !Number.isFinite(row.loadMs) ||
      row.loadMs < 0 ||
      row.loadMs >= 2000 ||
      (row.readyMs !== undefined &&
        (!Number.isFinite(row.readyMs) ||
          row.readyMs < 0 ||
          row.readyMs >= 2000)),
  );
  const readiness = rows.map((row) => row.readyMs).filter(Number.isFinite);
  const stableRelease =
    !!before && !!after && before.fingerprint === after.fingerprint;
  const expectedSamples = auditSpecifications.reduce(
    (sum, spec) => sum + spec.samples,
    0,
  );
  const passed =
    preflightPassed &&
    stableRelease &&
    rows.length === expectedSamples &&
    verificationErrors.length === 0 &&
    errors.length === 0 &&
    outliers.length === 0 &&
    commands.length === auditSpecifications.length &&
    commands.every((command) => command.exitCode === 0 && !command.error);
  return {
    url: base,
    deploymentId,
    timestamp: new Date().toISOString(),
    conditions:
      "Fresh browser contexts and caches, unthrottled network, desktop and iPhone13 emulation; verified CDN warmup. Identity inspection attempted before and after. Every sample and infrastructure failure retained; no retries.",
    browserChannel: reports[0]?.browserChannel ?? null,
    browserVersion: reports[0]?.browserVersion ?? null,
    fingerprint: before?.fingerprint ?? null,
    finalFingerprint: after?.fingerprint ?? null,
    stableRelease,
    verifiedAssets: warmup?.verifiedAssets ?? 0,
    samples: rows.length,
    expectedSamples,
    underTwoSeconds: loads.filter((load) => load >= 0 && load < 2000).length,
    medianLoadMs: loads.length ? loads[Math.floor(loads.length / 2)] : null,
    p95LoadMs: loads.length ? loads[Math.ceil(loads.length * 0.95) - 1] : null,
    maxLoadMs: loads.length ? Math.max(...loads) : null,
    maxReadyMs: readiness.length ? Math.max(...readiness) : null,
    errors,
    outliers,
    verificationErrors,
    commands,
    sources: reports.map((report) => report.source),
    passed,
  };
}
