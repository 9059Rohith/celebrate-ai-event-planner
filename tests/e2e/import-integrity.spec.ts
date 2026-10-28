import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

test("invalid imported rows cannot overwrite a saved celebration", async ({
  page,
  context,
}) => {
  const plan = JSON.parse(
    readFileSync("public/evals/cases/wedding-single-day.json", "utf8"),
  ).output;
  await context.addInitScript((saved) => {
    localStorage.setItem(
      "celebrate-ai-plans",
      JSON.stringify({
        version: 2,
        state: { plans: [saved], currentPlanId: saved.id },
      }),
    );
  }, plan);
  await page.goto("/");
  await page
    .getByRole("heading", { name: "My celebrations", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("link", { name: "Open plan", exact: true }),
  ).toHaveCount(1);
  const file = page.locator('input[type="file"]');
  const invalid = structuredClone(plan);
  invalid.timeline.milestones[1].id = invalid.timeline.milestones[0].id;
  await file.setInputFiles({
    name: "invalid-plan.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(invalid)),
  });
  const importNotice = page.locator("#my-plans").getByRole("alert");
  await expect(importNotice).toContainText("valid exported plan");
  await expect(
    page.getByRole("link", { name: "Open plan", exact: true }),
  ).toHaveCount(1);
  const stored = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("celebrate-ai-plans") || "{}").state
        .plans,
  );
  expect(stored).toEqual([plan]);
  await file.setInputFiles({
    name: "valid-plan.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(plan)),
  });
  await expect(
    page.getByRole("link", { name: "Open plan", exact: true }),
  ).toHaveCount(2);
  await expect(importNotice).toHaveCount(0);
});
