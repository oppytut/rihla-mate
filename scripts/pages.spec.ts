import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

test.describe("Pages Management Smoke Test", () => {
  test("Pages management page renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/pages`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "attached",
      timeout: 10000,
    });

    // Verify data actually loaded (not false-positive from unconditional header)
    await expect(page.locator('[data-testid="pages-page-info"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('[data-testid="pages-add-new-empty"]')).not.toBeVisible();

    const headingCount = await page.getByRole("heading").count();
    expect(headingCount).toBeGreaterThan(0);

    const addNewButton = page.locator('[data-testid="pages-add-new"]');
    await expect(addNewButton).toBeVisible({ timeout: 10000 });

    expect(page.url()).toContain("/dashboard/pages");
  });
});

test.describe("unauthorized access", () => {
  test("pages management page renders even without auth (no guard implemented)", async ({
    browser,
  }) => {
    // IMPORTANT: Use an isolated browser context (no storageState cookies)
    // so that clearing auth does NOT pollute the shared page fixture.
    // With workers: 1, using the shared page would poison ALL subsequent tests.
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/en/dashboard/pages`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "attached",
      timeout: 10000,
    });
    await expect(page.getByRole("heading", { name: "Pages" })).toBeVisible();
    expect(page.url()).toContain("/dashboard/pages");

    await context.close();
  });
});
