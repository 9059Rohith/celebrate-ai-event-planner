import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import LZString from "lz-string";

const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
async function audit(page: Page) {
  await page.evaluate((source) => {
    const script = document.createElement("script");
    script.nonce =
      document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce || "";
    script.textContent = source;
    document.head.appendChild(script);
  }, axeSource);
  const violations = await page.evaluate(async () => {
    const engine = window as typeof window & {
      axe: {
        run: (
          root: Document,
          options: object,
        ) => Promise<{
          violations: {
            id: string;
            impact: string;
            nodes: { target: string[] }[];
          }[];
        }>;
      };
    };
    const result = await engine.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    });
    return result.violations.map(({ id, impact, nodes }) => ({
      id,
      impact,
      targets: nodes.map((node) => node.target),
    }));
  });
  expect(violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", {
      name: /^(log\s?in|sign\s?in|sign\s?up|account|profile)$/i,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", {
      name: /^(log\s?in|sign\s?in|sign\s?up|account|profile)$/i,
    }),
  ).toHaveCount(0);
}

test("public pages meet automated WCAG checks in light and dark themes without account controls", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of [
    "/",
    "/plan/new",
    "/evals",
    "/privacy",
    "/offline",
    "/shared",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1").first()).toBeVisible();
    await audit(page);
    await page.getByRole("button", { name: "Toggle dark mode" }).click();
    await audit(page);
  }
  expect(errors).toEqual([]);
});

test("saved and shared plans remain accessible at narrow and wide widths", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
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
  for (const width of [360, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      `/plan/${plan.id}`,
      `/shared#${LZString.compressToEncodedURIComponent(JSON.stringify(plan))}`,
    ]) {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { name: plan.input.title, exact: true }),
      ).toBeVisible();
      await audit(page);
    }
  }
});
