import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

test.describe("Packages List Page Smoke Test", () => {
  test("Packages list page renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/packages`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "attached",
      timeout: 10000,
    });

    const headingCount = await page.getByRole("heading").count();
    expect(headingCount).toBeGreaterThan(0);

    const searchInput = page.locator('[data-testid="packages-search"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    const hasTable = page.locator("table");
    const hasEditButton = page.locator('[data-testid^="package-edit-"]');
    const tableOrEdit = hasTable.or(hasEditButton);
    await expect(tableOrEdit.first()).toBeVisible({ timeout: 10000 });

    expect(page.url()).toContain("/dashboard/packages");
  });
});

test.describe("unauthorized access", () => {
  test("packages page renders even without auth (no guard implemented)", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/packages`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "attached",
      timeout: 10000,
    });
    await expect(page.getByRole("heading", { name: "Packages" })).toBeVisible();
    expect(page.url()).toContain("/dashboard/packages");
  });
});
