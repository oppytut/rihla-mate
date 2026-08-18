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
    await expect(page.locator('[data-testid="pages-table"]')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('[data-testid="pages-add-new-empty"]')).not.toBeVisible();

    const addNewButton = page.locator('[data-testid="pages-add-new"]');
    await expect(addNewButton).toBeVisible({ timeout: 10000 });

    expect(page.url()).toContain("/dashboard/pages");
  });

  test("pagination is hidden on a single page, else previous is disabled on page 1", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/en/dashboard/pages`, {
      waitUntil: "domcontentloaded",
    });
    await waitForPageHeading(page);
    await expect(
      page.locator('[data-testid="pages-table"], [data-testid="pages-add-new-empty"]').first(),
    ).toBeVisible({ timeout: 15000 });

    const prevBtn = page.locator('[data-testid="pages-prev-page"]');
    const nextBtn = page.locator('[data-testid="pages-next-page"]');
    const pageInfo = page.locator('[data-testid="pages-page-info"]');

    const prevCount = await prevBtn.count();
    if (prevCount === 0) {
      await expect(nextBtn).toHaveCount(0);
      await expect(pageInfo).toHaveCount(0);
      return;
    }

    await expect(prevBtn).toBeVisible({ timeout: 5000 });
    await expect(nextBtn).toBeVisible({ timeout: 5000 });
    await expect(prevBtn).toBeDisabled({ timeout: 5000 });
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
