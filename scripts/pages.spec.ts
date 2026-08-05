import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";
import { waitForPageHeading } from "./helpers/ready";

test.describe("Pages Management Smoke Test", () => {
  test("Pages management page renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/pages`, {
      waitUntil: "domcontentloaded",
    });

    await waitForPageHeading(page);

    // Verify data actually loaded (not false-positive from unconditional header)
    await expect(page.locator('[data-testid="pages-page-info"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('[data-testid="pages-add-new-empty"]')).not.toBeVisible();

    const addNewButton = page.locator('[data-testid="pages-add-new"]');
    await expect(addNewButton).toBeVisible({ timeout: 10000 });

    expect(page.url()).toContain("/dashboard/pages");
  });
});

test.describe("unauthorized access", () => {
  test("pages management page redirects to sign-in without auth", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/en/dashboard/pages`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForURL("**/sign-in", { timeout: 15000 });
    expect(page.url()).toContain("/sign-in");

    await context.close();
  });
});
