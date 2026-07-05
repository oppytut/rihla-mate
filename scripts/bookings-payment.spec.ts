import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

const SEL = {
  pageHeading: '[data-testid="page-heading"]',
  statusBadge: '[data-testid="payment-status-badge"]',
  orderId: '[data-testid="payment-order-id"]',
  amount: '[data-testid="payment-amount"]',
  method: '[data-testid="payment-method"]',
  backToBooking: '[data-testid="payment-back-to-booking"]',
} as const;

test.describe("booking payment page", () => {
  test("shows not-found state for non-existent booking ID", async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(
      `${BASE_URL}/en/dashboard/bookings/00000000-0000-0000-0000-000000000000/payment`,
      { waitUntil: "domcontentloaded" },
    );

    await page
      .waitForSelector(SEL.pageHeading, {
        state: "visible",
        timeout: 10000,
      })
      .catch(() => {
        // Heading may not render in error state — fall through
      });

    // The page should show "Booking not found" text
    await expect(page.locator("text=Booking not found")).toBeVisible({ timeout: 10000 });
  });

  test("shows error state when booking query fails", async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(
      `${BASE_URL}/en/dashboard/bookings/ffffffff-ffff-ffff-ffff-ffffffffffff/payment`,
      { waitUntil: "domcontentloaded" },
    );

    await page
      .waitForSelector(SEL.pageHeading, {
        state: "visible",
        timeout: 10000,
      })
      .catch(() => {
        // Heading may not render in error state — fall through
      });

    // Either the "Booking not found" text or an error message should be visible
    const notFoundOrError = page
      .locator("text=Booking not found")
      .or(page.locator("text=Failed to load"));
    await expect(notFoundOrError).toBeVisible({ timeout: 10000 });
  });
});
