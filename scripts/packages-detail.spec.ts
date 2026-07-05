import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

test.describe("package detail page", () => {
  test("renders package detail page with key elements", async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(`${BASE_URL}/en/dashboard/packages/new`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "visible",
      timeout: 10000,
    });

    await expect(page.locator('[data-testid="page-heading"]')).toBeVisible();

    await expect(page.locator('[data-testid="package-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="package-slug"]')).toBeVisible();
    await expect(page.locator('[data-testid="package-description"]')).toBeVisible();
    await expect(page.locator('[data-testid="package-category"]')).toBeVisible();
    await expect(page.locator('[data-testid="package-duration-days"]')).toBeVisible();
    await expect(page.locator('[data-testid="package-departure-city"]')).toBeVisible();
    await expect(page.locator('[data-testid="package-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="package-price"]')).toBeVisible();
    await expect(page.locator('[data-testid="package-currency"]')).toBeVisible();
    await expect(page.locator('[data-testid="package-featured-image"]')).toBeVisible();
    await expect(page.locator('[data-testid="package-gallery"]')).toBeVisible();
    await expect(page.locator('[data-testid="package-itinerary"]')).toBeVisible();
    await expect(page.locator('[data-testid="package-inclusions"]')).toBeVisible();
    await expect(page.locator('[data-testid="package-exclusions"]')).toBeVisible();
    await expect(page.locator('[data-testid="package-available-dates"]')).toBeVisible();
    await expect(page.locator('[data-testid="package-submit"]')).toBeVisible();
  });

  test("shows validation errors on empty form submit", async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(`${BASE_URL}/en/dashboard/packages/new`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "visible",
      timeout: 10000,
    });

    await page.locator('[data-testid="package-submit"]').click();

    await page.waitForSelector('[data-testid="validation-error-title"]', {
      state: "visible",
      timeout: 10000,
    });

    await expect(page.locator('[data-testid="validation-error-title"]')).toBeVisible();
  });

  test("loads non-existent package detail page without crash", async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(`${BASE_URL}/en/dashboard/packages/00000000-0000-0000-0000-000000000000`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "visible",
      timeout: 10000,
    });

    await expect(page.locator('[data-testid="page-heading"]')).toBeVisible();
  });
});
