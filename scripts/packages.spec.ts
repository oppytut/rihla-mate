import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";
import { waitForPageHeading } from "./helpers/ready";

test.describe("Packages List Page Smoke Test", () => {
  test("Packages list page renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/packages`, {
      waitUntil: "domcontentloaded",
    });

    await waitForPageHeading(page);

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
  test("packages page redirects to sign-in without auth", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/en/dashboard/packages`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForURL("**/sign-in", { timeout: 15000 });
    expect(page.url()).toContain("/sign-in");

    await context.close();
  });
});
