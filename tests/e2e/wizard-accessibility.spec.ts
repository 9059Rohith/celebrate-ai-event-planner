import { expect, test } from "@playwright/test";

test("keyboard choices and step transitions preserve an accessible focus order", async ({
  page,
}) => {
  await page.goto("/plan/new?type=wedding");
  const birthday = page.getByRole("button", { name: "birthday", exact: true });
  await birthday.focus();
  await page.keyboard.press("Enter");
  await expect(birthday).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "wedding", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");

  await page.getByRole("button", { name: "Continue", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "People & budget", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: /People & budget/ }),
  ).toHaveAttribute("aria-current", "step");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Number of guests")).toBeFocused();

  await page.getByRole("button", { name: "Back", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "The occasion", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "wedding", exact: true }),
  ).toBeFocused();
  await expect(birthday).toHaveAttribute("aria-pressed", "true");
});
