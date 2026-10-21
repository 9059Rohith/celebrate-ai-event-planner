import { writeFileSync } from "node:fs";
import { productionUrl, warmRelease } from "./lib/release-cache.mjs";
const requests = [];
let report;
try {
  report = await warmRelease({ requests });
  console.log(
    JSON.stringify({
      ok: true,
      verifiedAssets: report.verifiedAssets,
      fingerprint: report.fingerprint,
    }),
  );
} catch (error) {
  report = { error: error.message };
  console.error(error.message);
  process.exitCode = 1;
} finally {
  writeFileSync(
    "reports/deployment-warmup.json",
    JSON.stringify(
      {
        url: productionUrl,
        timestamp: new Date().toISOString(),
        method:
          "Explicit server/CDN release warmup, verified critical-asset cache hits, stable asset fingerprint. No browser profile or browser cache is warmed; no failed requests retried or excluded.",
        ...report,
        requests,
      },
      null,
      2,
    ),
  );
}
