import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
const base =
  process.env.SCREENSHOT_URL || "https://celebrate-ai-event-planner.vercel.app";
const browser = await chromium.launch({ channel: "msedge" });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
const plan = JSON.parse(
  readFileSync("public/evals/cases/wedding-single-day.json", "utf8"),
).output;
await context.addInitScript(
  (value) =>
    localStorage.setItem(
      "celebrate-ai-plans",
      JSON.stringify({
        state: { plans: [value], currentPlanId: value.id },
        version: 2,
      }),
    ),
  plan,
);
const page = await context.newPage();
mkdirSync("docs/screenshots", { recursive: true });
const shot = async (name) => {
  await page.screenshot({
    path: `docs/screenshots/${name}.webp`,
    type: "webp",
    quality: 72,
  });
  console.log(name);
};
try {
  await page.goto(base);
  await page.locator("main h1").first().waitFor();
  await shot("01-home");
  await page.goto(`${base}/plan/new?type=wedding&example=1`);
  await page.getByLabel("Give your celebration a name").waitFor();
  await shot("02-intake");
  await page.goto(`${base}/plan/${plan.id}`);
  await page
    .getByRole("heading", { name: plan.input.title, exact: true })
    .waitFor();
  await shot("03-overview");
  for (const [tab, name] of [
    ["Budget", "04-budget"],
    ["Timeline", "05-timeline"],
    ["Vendors", "06-vendors"],
    ["Ideas", "07-ideas"],
  ]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    await page.waitForFunction(
      () => !document.querySelector('[aria-busy="true"]'),
    );
    await page.locator("main h2").first().waitFor();
    if (tab === "Budget") {
      await page.locator(".recharts-pie-sector path").first().waitFor();
      await page.waitForTimeout(1600);
      await page.evaluate(() => scrollTo(0, 300));
    }
    await shot(name);
    await page.evaluate(() => scrollTo(0, 0));
  }
  await page.goto(`${base}/evals`);
  await page
    .getByRole("heading", { name: "A planner you can put to the test." })
    .waitFor();
  await shot("08-evaluations");
} finally {
  await browser.close();
}
