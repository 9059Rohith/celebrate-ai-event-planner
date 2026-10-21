import { chromium } from "playwright";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const base = process.env.DEMO_URL || "http://localhost:4100";
const output = resolve(process.env.DEMO_OUTPUT || "../celebrate-ai-submission");
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge" });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: output, size: { width: 1280, height: 800 } },
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const pause = () => page.waitForTimeout(1800);
const video = page.video();
try {
  await page.goto(base);
  await pause();
  for (const type of ["wedding", "birthday", "community"]) {
    await page.goto(`${base}/plan/new?type=${type}&example=1`);
    await page
      .getByLabel("Give your celebration a name")
      .fill(
        `${type === "wedding" ? "Ananya & Arjun" : type === "birthday" ? "Maya’s birthday" : "Neighbourhood together"} celebration`,
      );
    for (let step = 0; step < 4; step++) {
      await pause();
      await page.getByRole("button", { name: "Continue", exact: true }).click();
    }
    await pause();
    await page.getByRole("button", { name: "Create my celebration" }).click();
    await page.waitForURL(/\/plan\/(?!new)/);
    await page.locator("main h1").first().waitFor();
    await pause();
    if (type !== "wedding") continue;
    for (const tab of ["Budget", "Timeline", "Vendors", "Ideas"]) {
      await page.getByRole("button", { name: tab, exact: true }).click();
      await pause();
      if (tab === "Timeline") {
        await page
          .getByRole("combobox", { name: /Status for/ })
          .first()
          .selectOption("done");
      }
      if (tab === "Vendors") await page.getByRole("checkbox").first().check();
      if (tab === "Ideas")
        await page
          .getByRole("button", { name: /^Save / })
          .first()
          .click();
      await page.mouse.wheel(0, 350);
      await pause();
      await page.evaluate(() => scrollTo(0, 0));
    }
    await page
      .getByRole("button", { name: "Ask the planner", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Message the planner" })
      .fill("Set guests to 100");
    await page.getByRole("button", { name: "Send message" }).click();
    await page
      .getByRole("button", { name: "Accept change", exact: true })
      .first()
      .waitFor({ timeout: 45000 });
    await pause();
    await page
      .getByRole("button", { name: "Accept change", exact: true })
      .first()
      .click();
    await pause();
    await page.getByRole("button", { name: "Overview", exact: true }).click();
    await page.getByRole("button", { name: "Share plan", exact: true }).click();
    await page
      .getByText(
        "Read-only share link copied. Anyone with the link can view this copy.",
      )
      .waitFor();
    await page.goto(await page.evaluate(() => navigator.clipboard.readText()));
    await page.getByText("This is a shared copy. Import to edit.").waitFor();
    await pause();
    await page.getByRole("button", { name: "Import to my plans" }).click();
    await page.waitForURL(/\/plan\//);
    await pause();
  }
  await page.goto(`${base}/evals`);
  await page.locator("main h1").first().waitFor();
  await pause();
  await page.locator("main details > summary").first().click();
  await page.locator("main details li").first().waitFor();
  await pause();
  await page.getByText("Input / output JSON", { exact: true }).first().click();
  await pause();
  if (errors.length) throw Error(errors.join("\n"));
} finally {
  await context.close();
  const recorded = await video.path();
  renameSync(recorded, join(output, "celebrate-ai-demo.webm"));
  writeFileSync(
    join(output, "demo-metadata.json"),
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        base,
        browser: browser.version(),
        errors,
        description:
          "Actual UI recording. AI source badges distinguish templates from provider output; evaluation shown is the recorded offline engine run.",
      },
      null,
      2,
    ),
  );
  await browser.close();
}
console.log(join(output, "celebrate-ai-demo.webm"));
