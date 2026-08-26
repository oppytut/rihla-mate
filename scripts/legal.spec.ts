import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

test.describe("product legal pages", () => {
  test.use({ storageState: undefined });

  test("privacy policy renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/privacy`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(
      /Ada yang tidak beres|Something went wrong/i,
    );
    await expect(page.locator("#who")).toBeVisible();
  });

  test("terms of service renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/terms`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(
      /Ada yang tidak beres|Something went wrong/i,
    );
    await expect(page.locator("#product")).toBeVisible();
  });
});
