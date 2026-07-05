import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

const SEL = {
  customerName: '[data-testid="booking-customer-name"]',
  packageId: '[data-testid="booking-package"]',
  travelers: '[data-testid="booking-travelers"]',
  totalPrice: '[data-testid="booking-total-price"]',
  departureDateButton: '[data-testid="booking-departure-date"]',
  submitButton: '[data-testid="booking-submit"]',
  pageHeading: '[data-testid="page-heading"]',
  validationError: '[data-testid^="validation-error-"]',
  backToList: '[data-testid="bookings-back-to-list"]',
  cancelButton: '[data-testid="booking-cancel"]',
  statusSelect: '[data-testid="booking-status"]',
  customerEmail: '[data-testid="booking-customer-email"]',
  customerPhone: '[data-testid="booking-customer-phone"]',
  notes: '[data-testid="booking-notes"]',
} as const;

test.describe("booking detail page", () => {
  test("renders booking detail page with key elements", async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(`${BASE_URL}/en/dashboard/bookings/new`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector(SEL.pageHeading, {
      state: "visible",
      timeout: 10000,
    });

    // Verify page heading is visible
    await expect(page.locator(SEL.pageHeading)).toBeVisible();

    // Verify all form elements are present
    await page.waitForSelector(SEL.customerName, {
      state: "visible",
      timeout: 10000,
    });
    await expect(page.locator(SEL.customerName)).toBeVisible();

    await page.waitForSelector(SEL.packageId, {
      state: "visible",
      timeout: 10000,
    });
    await expect(page.locator(SEL.packageId)).toBeVisible();

    await page.waitForSelector(SEL.departureDateButton, {
      state: "visible",
      timeout: 10000,
    });
    await expect(page.locator(SEL.departureDateButton)).toBeVisible();

    await page.waitForSelector(SEL.travelers, {
      state: "visible",
      timeout: 10000,
    });
    await expect(page.locator(SEL.travelers)).toBeVisible();

    await page.waitForSelector(SEL.totalPrice, {
      state: "visible",
      timeout: 10000,
    });
    await expect(page.locator(SEL.totalPrice)).toBeVisible();

    await page.waitForSelector(SEL.submitButton, {
      state: "visible",
      timeout: 10000,
    });
    await expect(page.locator(SEL.submitButton)).toBeVisible();

    // Verify additional detail-page elements (back-to-list, cancel, status, email, phone, notes)
    await expect(page.locator(SEL.backToList)).toBeVisible();
    await expect(page.locator(SEL.cancelButton)).toBeVisible();
    await expect(page.locator(SEL.statusSelect)).toBeVisible();
    await expect(page.locator(SEL.customerEmail)).toBeVisible();
    await expect(page.locator(SEL.customerPhone)).toBeVisible();
    await expect(page.locator(SEL.notes)).toBeVisible();
  });

  test("shows validation errors on empty form submit", async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(`${BASE_URL}/en/dashboard/bookings/new`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector(SEL.pageHeading, {
      state: "visible",
      timeout: 10000,
    });

    // Wait for submit button to be hydrated and interactive
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="booking-submit"]') as HTMLButtonElement;
        return el && !el.disabled;
      },
      { timeout: 10000 },
    );

    // Submit empty form to trigger validation
    await page.locator(SEL.submitButton).click();

    await page.waitForSelector(SEL.validationError, {
      state: "attached",
      timeout: 10000,
    });

    const errorCount = await page.locator(SEL.validationError).count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test("loads non-existent booking detail page without crash", async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(`${BASE_URL}/en/dashboard/bookings/00000000-0000-0000-0000-000000000000`, {
      waitUntil: "domcontentloaded",
    });

    // The page should load — either showing an error state or a not-found state.
    // We just verify the page doesn't crash (no full-page error).
    // Wait a brief moment for React to render.
    await page.waitForSelector(
      `${SEL.pageHeading}, [data-testid^="validation-error-"], .bg-destructive`,
      {
        state: "visible",
        timeout: 10000,
      },
    );

    // Page should have rendered something (heading, error, or not-found state)
    const hasHeading = await page
      .locator(SEL.pageHeading)
      .isVisible()
      .catch(() => false);
    const hasError = await page
      .locator(".bg-destructive\\/10")
      .isVisible()
      .catch(() => false);
    const hasNotFound = await page
      .locator("text=not found")
      .isVisible()
      .catch(() => false);

    // At least one of these conditions should be true — the page rendered
    expect(hasHeading || hasError || hasNotFound).toBe(true);
  });
});
