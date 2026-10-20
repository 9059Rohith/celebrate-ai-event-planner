import { chromium, devices } from "playwright";
import { writeFileSync } from "node:fs";
const base =
  process.env.TEST_BASE_URL || "https://celebrate-ai-event-planner.vercel.app";
const phase = process.env.PERF_PHASE || "after";
const browser = await chromium.launch();
const results = [];
try {
  for (const device of ["desktop", "mobile"])
    for (let sample = 1; sample <= 3; sample++)
      for (const path of [
        "/",
        "/plan/new",
        "/evals",
        "/privacy",
        "/offline",
        "/shared",
      ]) {
        const context = await browser.newContext(
          device === "mobile"
            ? { ...devices["iPhone 13"] }
            : { viewport: { width: 1440, height: 1000 } },
        );
        const page = await context.newPage();
        const errors = [];
        page.on("requestfailed", (r) =>
          errors.push({ url: r.url(), failure: r.failure()?.errorText }),
        );
        page.on("pageerror", (e) => errors.push({ pageError: e.message }));
        try {
          const response = await page.goto(base + path, {
            waitUntil: "load",
            timeout: 45000,
          });
          const metrics = await page.evaluate(() => {
            const n = performance.getEntriesByType("navigation")[0];
            return {
              loadMs: n.loadEventStart,
              domMs: n.domContentLoadedEventEnd,
              ttfbMs: n.responseStart,
              resources: performance
                .getEntriesByType("resource")
                .map((r) => ({
                  url: r.name,
                  duration: r.duration,
                  start: r.startTime,
                  end: r.responseEnd,
                  transfer: r.transferSize,
                }))
                .sort((a, b) => b.duration - a.duration)
                .slice(0, 5),
            };
          });
          const row = {
            device,
            sample,
            path,
            status: response.status(),
            server: response.headers()["x-vercel-id"],
            ...metrics,
            errors,
          };
          results.push(row);
          console.log(
            JSON.stringify({
              device,
              sample,
              path,
              loadMs: Math.round(row.loadMs),
              ttfbMs: Math.round(row.ttfbMs),
              errors: errors.length,
            }),
          );
        } catch (error) {
          results.push({ device, sample, path, error: error.message });
        } finally {
          await context.close();
        }
        writeFileSync(
          `reports/full-load-${phase}.json`,
          JSON.stringify(
            {
              url: base,
              timestamp: new Date().toISOString(),
              method:
                "36 actual load-event measurements: fresh context/cache for every route, three samples on desktop and emulated iPhone13, default unthrottled network. No warmup or failing-sample exclusion.",
              results,
            },
            null,
            2,
          ),
        );
      }
  const valid = results.filter((r) => Number.isFinite(r.loadMs));
  console.log(
    JSON.stringify({
      samples: results.length,
      failures: results.filter(
        (r) => r.error || r.status !== 200 || r.errors.length,
      ).length,
      maxLoadMs: Math.max(...valid.map((r) => r.loadMs)),
      overTwoSeconds: valid
        .filter((r) => r.loadMs >= 2000)
        .map((r) => ({
          device: r.device,
          sample: r.sample,
          path: r.path,
          loadMs: r.loadMs,
        })),
    }),
  );
} finally {
  await browser.close();
}
