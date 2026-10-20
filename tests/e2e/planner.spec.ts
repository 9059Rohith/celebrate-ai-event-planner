import { test, expect } from "@playwright/test";
for (const type of ["wedding", "birthday", "community"])
  test(`${type}: planning, edits, exports and sharing`, async ({
    page,
    context,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`/plan/new?type=${type}&example=1`);
    await page
      .getByLabel("Give your celebration a name")
      .fill(`${type} e2e celebration`);
    for (let i = 0; i < 4; i++)
      await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Create my celebration" }).click();
    await page.waitForURL(/\/plan\/(?!new)/);
    await expect(
      page.getByRole("heading", {
        name: `${type} e2e celebration`,
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Timeline", exact: true }).click();
    await page
      .getByRole("combobox", { name: /Status for/ })
      .first()
      .selectOption("done");
    await page.reload();
    await expect(
      page.getByRole("combobox", { name: /Status for/ }).first(),
    ).toHaveValue("done");
    await page.getByRole("button", { name: "Budget", exact: true }).click();
    const slider = page.getByRole("slider", { name: /allocation/ }).first();
    await slider.focus();
    await slider.press("ArrowRight");
    await expect(
      page.getByRole("heading", { name: "Dream big. Spend thoughtfully." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Vendors", exact: true }).click();
    const check = page.getByRole("checkbox").first();
    await check.check();
    await expect(check).toBeChecked();
    await page.getByRole("button", { name: "Ideas", exact: true }).click();
    await page
      .getByRole("button", { name: /^Save / })
      .first()
      .click();
    await page.getByRole("button", { name: "saved", exact: true }).click();
    await expect(
      page.getByRole("button", { name: /^Unsave / }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Helpful", exact: true }).click();
    await expect(
      page.getByText("Thank you — saved on this device."),
    ).toBeVisible();
    const jsonDownload = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export JSON", exact: true })
      .click();
    expect((await jsonDownload).suggestedFilename()).toBe("celebration.json");
    await page.getByRole("button", { name: "Timeline", exact: true }).click();
    const icsDownload = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export calendar", exact: true })
      .click();
    expect((await icsDownload).suggestedFilename()).toBe("celebration.ics");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Share plan", exact: true }).click();
    const url = await page.evaluate(() => navigator.clipboard.readText());
    expect(url).toContain("/shared#");
    await page.goto(url);
    await expect(
      page.getByText("This is a shared copy. Import to edit."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Import to my plans" }).click();
    await page.waitForURL(/\/plan\//);
    await expect(
      page.getByRole("heading", {
        name: `${type} e2e celebration`,
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
test("theme, currency and privacy persist", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Default currency").selectOption("USD");
  await page.getByRole("button", { name: "Toggle dark mode" }).click();
  await page.reload();
  await expect(page.getByLabel("Default currency")).toHaveValue("USD");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("link", { name: "Privacy & your data" }).click();
  await expect(
    page.getByRole("heading", { name: "Your plans, your privacy." }),
  ).toBeVisible();
});
test("saved plans remain editable offline without caching API responses", async ({
  page,
  context,
}) => {
  await page.goto("/plan/new?type=birthday");
  await page
    .getByLabel("Give your celebration a name")
    .fill("Offline birthday");
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Create my celebration" }).click();
  await page.waitForURL(/\/plan\/(?!new)/);
  const id = new URL(page.url()).pathname.split("/").pop();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(
      () => page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
      { timeout: 30000 },
    )
    .toBe(true);
  await context.setOffline(true);
  await page.goto(`/plan/new?offlinePlan=${id}`);
  await expect(
    page.getByRole("heading", { name: "Offline birthday", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Budget", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Dream big. Spend thoughtfully." }),
  ).toBeVisible();
  const slider = page.getByRole("slider", { name: /allocation/ }).first();
  await slider.focus();
  await slider.press("ArrowRight");
  const apiCached = await page.evaluate(async () => {
    const names = await caches.keys();
    for (const name of names) {
      const cache = await caches.open(name);
      if (
        (await cache.keys()).some((r) =>
          new URL(r.url).pathname.startsWith("/api/"),
        )
      )
        return true;
    }
    return false;
  });
  expect(apiCached).toBe(false);
  await context.setOffline(false);
});
test("visual snapshots and nonce security headers", async ({ page }, info) => {
  const first = await page.goto("/");
  expect(first?.headers()["content-security-policy"]).toContain(
    "'strict-dynamic'",
  );
  const nonce = first
    ?.headers()
    ["content-security-policy"].match(/nonce-([^']+)/)?.[1];
  expect(nonce).toBeTruthy();
  const second = await page.request.get("/");
  expect(second.headers()["content-security-policy"]).not.toContain(
    `nonce-${nonce}`,
  );
  await page.screenshot({ path: info.outputPath("home.png"), fullPage: true });
  await page.goto("/plan/new");
  await expect(page.getByLabel("Give your celebration a name")).toBeVisible();
  await expect(page.getByLabel("Number of guests")).toHaveCount(0);
  await page.screenshot({
    path: info.outputPath("wizard.png"),
    fullPage: true,
  });
});
