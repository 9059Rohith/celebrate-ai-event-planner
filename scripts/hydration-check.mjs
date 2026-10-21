import { chromium, devices } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import LZString from "lz-string";
const plan = JSON.parse(
  readFileSync("public/evals/cases/wedding-single-day.json", "utf8"),
).output;
const phase = process.env.PERF_PHASE || "after";
const base =
  process.env.HYDRATION_URL || "https://celebrate-ai-event-planner.vercel.app";
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || undefined,
});
const results = [];
try {
  for (let i = 0; i < 20; i++) {
    const mobile = Boolean(i % 2);
    const dark = Boolean(Math.floor(i / 2) % 2);
    const context = await browser.newContext(
      mobile
        ? { ...devices["iPhone 13"], colorScheme: dark ? "dark" : "light" }
        : {
            viewport: { width: 1440, height: 1000 },
            colorScheme: dark ? "dark" : "light",
          },
    );
    await context.addInitScript(
      ({ plan, dark }) => {
        localStorage.setItem(
          "celebrate-ai-plans",
          JSON.stringify({
            state: { plans: [plan], currentPlanId: plan.id },
            version: 2,
          }),
        );
        localStorage.setItem(
          "celebrate-ai-ui",
          JSON.stringify({
            state: {
              theme: dark ? "dark" : "light",
              currency: "USD",
              activeTab: "overview",
            },
            version: 0,
          }),
        );
      },
      { plan, dark },
    );
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (
        ["error", "warning"].includes(m.type()) &&
        /hydrat|#418|didn.t match/i.test(m.text())
      )
        errors.push(m.text());
    });
    try {
      const response = await page.goto(
        base +
          "/shared#" +
          LZString.compressToEncodedURIComponent(JSON.stringify(plan)),
        { waitUntil: "load", timeout: 30000 },
      );
      await page
        .getByRole("heading", { name: plan.input.title, exact: true })
        .waitFor();
      const metrics = await page.evaluate(() => ({
        loadMs: performance.getEntriesByType("navigation")[0].loadEventStart,
        dnsMs:
          performance.getEntriesByType("navigation")[0].domainLookupEnd -
          performance.getEntriesByType("navigation")[0].domainLookupStart,
        connectMs:
          performance.getEntriesByType("navigation")[0].connectEnd -
          performance.getEntriesByType("navigation")[0].connectStart,
        requestWaitMs:
          performance.getEntriesByType("navigation")[0].responseStart -
          performance.getEntriesByType("navigation")[0].requestStart,
        readyMs: performance.now(),
        requestStartMs:
          performance.getEntriesByType("navigation")[0].requestStart,
        responseEndMs:
          performance.getEntriesByType("navigation")[0].responseEnd,
        resources: performance
          .getEntriesByType("resource")
          .map((r) => ({
            url: r.name,
            start: r.startTime,
            end: r.responseEnd,
            duration: r.duration,
            requestStart: r.requestStart,
            responseStart: r.responseStart,
            transfer: r.transferSize,
            protocol: r.nextHopProtocol,
          }))
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 5),
      }));
      const row = {
        sample: i + 1,
        mobile,
        dark,
        status: response.status(),
        ...metrics,
        errors,
      };
      results.push(row);
      console.log(JSON.stringify(row));
    } catch (error) {
      results.push({
        sample: i + 1,
        mobile,
        dark,
        error: error.message,
        errors,
      });
    } finally {
      await context.close();
    }
    writeFileSync(
      `reports/shared-hydration-${phase}.json`,
      JSON.stringify(
        {
          url: base,
          browserChannel: process.env.BROWSER_CHANNEL || "bundled-chromium",
          browserVersion: await browser.version(),
          method:
            "20 fresh-cache contexts, ten desktop/ten emulated iPhone13, persisted plans/USD/light and dark themes; actual navigation-load and heading-ready events, unthrottled network.",
          results,
        },
        null,
        2,
      ),
    );
  }
} finally {
  await browser.close();
}
if (
  results.some(
    (r) =>
      r.error ||
      r.errors.length ||
      !Number.isFinite(r.loadMs) ||
      r.loadMs >= 2000 ||
      r.readyMs >= 2000,
  )
)
  process.exitCode = 1;
