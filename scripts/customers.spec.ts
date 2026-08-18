import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";
import { waitForPageHeading } from "./helpers/ready";

test.describe("Customers Page Smoke Test", () => {
  test("Customers page renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/customers`, {
      waitUntil: "domcontentloaded",
    });

    await waitForPageHeading(page);

    expect(page.url()).toContain("/dashboard/customers");
  });

  test("pagination is hidden on a single page, else previous is disabled on page 1", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/en/dashboard/customers`, {
      waitUntil: "domcontentloaded",
    });
    await waitForPageHeading(page);
    await expect(
      page.locator('[data-testid="customers-table"], [data-testid="customers-empty"]').first(),
    ).toBeVisible({ timeout: 15000 });

    const prevBtn = page.locator('[data-testid="customers-prev-page"]');
    const nextBtn = page.locator('[data-testid="customers-next-page"]');
    const pageInfo = page.locator('[data-testid="customers-page-info"]');

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
  test("customers page redirects to sign-in without auth", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/en/dashboard/customers`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForURL("**/sign-in", { timeout: 15000 });
    expect(page.url()).toContain("/sign-in");

    await context.close();
  });
});
