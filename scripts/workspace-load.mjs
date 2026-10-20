import { chromium, devices } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import LZString from "lz-string";
const fixture = JSON.parse(
  readFileSync("public/evals/cases/wedding-single-day.json", "utf8"),
).output;
const base = "https://celebrate-ai-event-planner.vercel.app";
const browser = await chromium.launch();
const results = [];
try {
  for (const device of ["desktop", "mobile"])
    for (let sample = 1; sample <= 3; sample++)
      for (const kind of ["saved", "shared"]) {
        const context = await browser.newContext(
          device === "mobile"
            ? { ...devices["iPhone 13"] }
            : { viewport: { width: 1440, height: 1000 } },
        );
        await context.addInitScript(
          (plan) =>
            localStorage.setItem(
              "celebrate-ai-plans",
              JSON.stringify({
                state: { plans: [plan], currentPlanId: plan.id },
                version: 2,
              }),
            ),
          fixture,
        );
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("requestfailed", (r) => errors.push(r.failure()?.errorText));
        try {
          const path =
            kind === "saved"
              ? `/plan/${fixture.id}`
              : `/shared#${LZString.compressToEncodedURIComponent(JSON.stringify(fixture))}`;
          await page.goto(base + path, { waitUntil: "load" });
          await page
            .getByRole("heading", { name: fixture.input.title, exact: true })
            .waitFor();
          const metrics = await page.evaluate(() => ({
            loadMs:
              performance.getEntriesByType("navigation")[0].loadEventStart,
            readyMs: performance.now(),
          }));
          const row = { device, sample, kind, ...metrics, errors };
          results.push(row);
          console.log(JSON.stringify(row));
        } catch (error) {
          results.push({ device, sample, kind, error: error.message });
        } finally {
          await context.close();
        }
        writeFileSync(
          "reports/workspace-load-after.json",
          JSON.stringify(
            {
              url: base,
              method:
                "Three fresh contexts per device for saved workspace and valid compressed shared plan; actual load and heading-ready events; default unthrottled network.",
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
