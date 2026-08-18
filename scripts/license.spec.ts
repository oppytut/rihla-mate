import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";
import { waitForPageHeading } from "./helpers/ready";

test.describe("License Page Smoke Test", () => {
  test("License page renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/license`, {
      waitUntil: "domcontentloaded",
    });

    await waitForPageHeading(page);

    expect(page.url()).toContain("/dashboard/license");
  });

  test("pagination is hidden on a single page, else previous is disabled on page 1", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/en/dashboard/license`, {
      waitUntil: "domcontentloaded",
    });
    await waitForPageHeading(page);
    await expect(
      page.locator('[data-testid="license-table"], [data-testid="license-empty"]').first(),
    ).toBeVisible({ timeout: 15000 });

    const prevBtn = page.locator('[data-testid="license-prev-page"]');
    const nextBtn = page.locator('[data-testid="license-next-page"]');
    const pageInfo = page.locator('[data-testid="license-page-info"]');

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
  test("license page redirects to sign-in without auth", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/en/dashboard/license`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForURL("**/sign-in", { timeout: 15000 });
    expect(page.url()).toContain("/sign-in");

    await context.close();
  });
});
