import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { PlanSchema } from "../../lib/schemas";

async function exportedPlan(page: Page) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON", exact: true }).click();
  const file = await (await pending).path();
  if (!file) throw new Error("Plan export is missing");
  return PlanSchema.parse(JSON.parse(readFileSync(file, "utf8")));
}

test("saved AI retry requires acceptance, preserves edits, and supports one-step undo", async ({
  page,
  context,
}, testInfo) => {
  const plan = PlanSchema.parse(
    JSON.parse(
      readFileSync("public/evals/cases/wedding-single-day.json", "utf8"),
    ).output,
  );
  plan.version = 7;
  plan.meta.source = "fallback";
  plan.summary.oneParagraphVision = "Our original family celebration.";
  plan.budget.lines[0].locked = true;
  plan.timeline.milestones[0].status = "done";
  plan.timeline.milestones[0].notes =
    "The family approved this venue.\nKeep the original booking.";
  plan.vendors[0].status = "confirmed";
  plan.vendors[0].checklist[0].done = true;
  plan.vendors[0].checklist.push({
    id: "retained-custom-task",
    text: "Confirm family access",
    done: true,
    critical: false,
  });
  plan.ideas[0].saved = true;
  await context.addInitScript((saved) => {
    localStorage.setItem(
      "celebrate-ai-plans",
      JSON.stringify({
        version: 2,
        state: { plans: [saved], currentPlanId: saved.id },
      }),
    );
  }, plan);
  let requests = 0;
  await page.route("**/api/plan/generate", async (route) => {
    requests++;
    expect(route.request().postDataJSON()).toMatchObject({ mode: "refine" });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        summary: {
          oneParagraphVision: "An enhanced, accessible family celebration.",
        },
        sections: [
          {
            section: "budget",
            changes: [
              {
                id: plan.budget.lines[1].id,
                notes: "Obtain an itemized quote.",
              },
            ],
          },
          { section: "timeline", changes: [] },
          {
            section: "vendors",
            changes: [
              {
                id: plan.vendors[0].id,
                why: "Retain the confirmed family-friendly provider.",
              },
            ],
          },
          {
            section: "ideas",
            changes: [
              { id: plan.ideas[0].id, title: "Personalized welcome keepsake" },
            ],
          },
        ],
        meta: { source: "hybrid", promptVersion: "2026-10-v2" },
      }),
    });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`/plan/${plan.id}`);
  await page
    .getByRole("button", { name: "Retry with AI", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Review AI details", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("retry-review.png"),
    fullPage: true,
  });
  expect((await exportedPlan(page)).summary.oneParagraphVision).toBe(
    plan.summary.oneParagraphVision,
  );
  await page
    .getByRole("button", { name: "Accept AI details", exact: true })
    .click();
  const accepted = await exportedPlan(page);
  expect(accepted.summary.oneParagraphVision).toBe(
    "An enhanced, accessible family celebration.",
  );
  expect(accepted.budget.lines[0]).toEqual(plan.budget.lines[0]);
  expect(accepted.timeline).toEqual(plan.timeline);
  expect(accepted.vendors[0].checklist).toEqual(plan.vendors[0].checklist);
  expect(accepted.vendors[0].status).toBe("confirmed");
  expect(accepted.ideas[0].saved).toBe(true);
  await page
    .getByRole("button", { name: "Undo last plan change", exact: true })
    .click();
  const restored = await exportedPlan(page);
  expect(restored.summary).toEqual(plan.summary);
  expect(restored.budget.lines).toEqual(plan.budget.lines);
  expect(restored.timeline).toEqual(plan.timeline);
  expect(restored.vendors).toEqual(plan.vendors);
  expect(restored.ideas).toEqual(plan.ideas);
  expect(requests).toBe(1);
  expect(errors).toEqual([]);
});
