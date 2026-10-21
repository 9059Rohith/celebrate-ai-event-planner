import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
const base =
  process.env.LIGHTHOUSE_URL || "https://celebrate-ai-event-planner.vercel.app";
const browser = await launch({
  chromePath: chromium.executablePath(),
  chromeFlags: [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
  ],
});
const results = [];
try {
  await lighthouse(base + "/privacy", {
    port: browser.port,
    logLevel: "error",
    onlyCategories: ["performance"],
  });
  for (let sample = 1; sample <= 3; sample++)
    for (const path of ["/", "/plan/new"]) {
      const { lhr } = await lighthouse(base + path, {
        port: browser.port,
        logLevel: "error",
        onlyCategories: [
          "performance",
          "accessibility",
          "best-practices",
          "seo",
        ],
        disableStorageReset: false,
      });
      const row = {
        path,
        sample,
        timestamp: lhr.fetchTime,
        runtimeError: lhr.runtimeError || null,
        performance: lhr.categories.performance.score,
        accessibility: lhr.categories.accessibility.score,
        bestPractices: lhr.categories["best-practices"].score,
        seo: lhr.categories.seo.score,
        lcpMs: lhr.audits["largest-contentful-paint"].numericValue,
        cls: lhr.audits["cumulative-layout-shift"].numericValue,
        observedLcpMs:
          lhr.audits.metrics.details.items[0].observedLargestContentfulPaint,
        observedLoadMs: lhr.audits.metrics.details.items[0].observedLoad,
      };
      results.push(row);
      console.log(JSON.stringify(row));
    }
  const summary = ["/", "/plan/new"].map((path) => {
    const runs = results.filter((r) => r.path === path);
    if (runs.some((r) => r.runtimeError))
      throw Error("Invalid trace; no passing performance claim allowed.");
    const values = runs.map((r) => r.lcpMs).sort((a, b) => a - b);
    return {
      path,
      medianLcpMs: values[1],
      minLcpMs: values[0],
      maxLcpMs: values[2],
      underTwoSeconds: values[1] < 2000,
    };
  });
  writeFileSync(
    "reports/performance-live.json",
    JSON.stringify(
      {
        url: base,
        method:
          "Three cache-reset Lighthouse mobile simulated Slow 4G runs per route; median reported. No settings relaxed.",
        results,
        summary,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(summary));
} finally {
  await browser.kill();
}
