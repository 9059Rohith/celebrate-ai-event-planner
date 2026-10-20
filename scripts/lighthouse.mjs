import { chromium } from "playwright";
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { writeFileSync, mkdirSync } from "node:fs";
const base = process.env.LIGHTHOUSE_URL || "http://localhost:4100";
const chrome = await launch({
  chromePath: process.env.CHROME_PATH || chromium.executablePath(),
  chromeFlags: [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--window-size=412,915",
  ],
  logLevel: "silent",
});
try {
  mkdirSync("reports", { recursive: true });
  // Edge can omit navigationStart on its first trace. Warm the browser instrumentation;
  // each measured Lighthouse navigation still resets origin storage and network cache.
  const warmup = await lighthouse(base + "/privacy", {
    port: chrome.port,
    output: "json",
    logLevel: "error",
    onlyCategories: ["performance"],
  });
  const results = [];
  for (const path of ["/", "/plan/new"]) {
    const run = await lighthouse(base + path, {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      disableStorageReset: false,
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    });
    const lhr = run.lhr;
    const result = {
      path,
      fetchTime: lhr.fetchTime,
      browserWarmupTraceError: warmup.lhr.runtimeError?.code || null,
      runtimeError: lhr.runtimeError || null,
      scores: Object.fromEntries(
        Object.entries(lhr.categories).map(([key, value]) => [
          key,
          value.score === null ? null : Math.round(value.score * 100),
        ]),
      ),
      metrics: {
        lcp: lhr.audits["largest-contentful-paint"].numericValue,
        cls: lhr.audits["cumulative-layout-shift"].numericValue,
        ttfb: lhr.audits["server-response-time"]?.numericValue,
      },
      failed: Object.entries(lhr.audits)
        .filter(
          ([, a]) =>
            a.score !== null && a.score < 1 && a.scoreDisplayMode === "binary",
        )
        .map(([id, a]) => ({
          id,
          title: a.title,
          details: a.details?.items?.slice(0, 5),
        })),
    };
    results.push(result);
    writeFileSync(
      `reports/lighthouse-${path === "/" ? "home" : "wizard"}.json`,
      run.report,
    );
    console.log(JSON.stringify(result));
  }
  writeFileSync(
    "reports/lighthouse-summary.json",
    JSON.stringify(results, null, 2),
  );
  if (results.some((r) => r.runtimeError)) process.exitCode = 1;
} finally {
  await chrome.kill();
}
