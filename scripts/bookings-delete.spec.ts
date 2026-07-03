import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

const SEL = {
  customerName: '[data-testid="booking-customer-name"]',
  packageSelect: '[data-testid="booking-package"]',
  departureDateButton: '[data-testid="booking-departure-date"]',
  travelers: '[data-testid="booking-travelers"]',
  totalPrice: '[data-testid="booking-total-price"]',
  submitButton: '[data-testid="booking-submit"]',
  popoverContent: '[data-slot="popover-content"]',
  calendarNextButton: '[data-slot="calendar"] button[class*="button_next"]',
  calendarDay: (date: string) => `[data-slot="calendar"] button[data-day*="${date}"]`,
} as const;

test.describe("booking delete flow", () => {
  test("creates a booking then deletes it from the list", async ({ page }) => {
    // ── Create phase ────────────────────────────────────────────────
    await page.goto(`${BASE_URL}/en/dashboard/bookings/new`, {
      waitUntil: "load",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "visible",
      timeout: 10000,
    });

    await page.fill(SEL.customerName, "Playwright Test Customer Delete");

    // Wait for packages to load
    await page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel) as HTMLSelectElement;
        return el && el.options.length > 1;
      },
      "#packageId",
      { timeout: 10000 },
    );

    // Resolve the option value for "Komodo Island Expedition" by its text content
    const komodoOptionValue = await page
      .locator("#packageId option")
      .filter({ hasText: "Komodo Island Expedition" })
      .getAttribute("value");
    if (!komodoOptionValue) throw new Error("Komodo Island Expedition option not found");
    await page.locator(SEL.packageSelect).selectOption(komodoOptionValue);
    await expect(page.locator(SEL.packageSelect)).toHaveValue(komodoOptionValue, { timeout: 5000 });

    // Open date picker and navigate to July 1, 2026
    await page.locator(SEL.departureDateButton).click();
    await page.waitForSelector(SEL.popoverContent, {
      state: "visible",
      timeout: 5000,
    });

    const monthsAhead = (2026 - new Date().getFullYear()) * 12 + (8 - (new Date().getMonth() + 1));
    for (let i = 0; i < monthsAhead; i++) {
      await page.locator(SEL.calendarNextButton).click();
      await page.waitForTimeout(100);
    }
    await page.locator(SEL.calendarDay("8/5/2026")).first().click();

    await page.fill(SEL.travelers, "2");
    await page.fill(SEL.totalPrice, "1500000");

    // Confirm React hydration before submitting the form
    await page.locator(SEL.departureDateButton).click();
    await page.waitForSelector(SEL.popoverContent, {
      state: "visible",
      timeout: 5000,
    });
    await page.keyboard.press("Escape");
    await page.waitForSelector(SEL.popoverContent, {
      state: "hidden",
      timeout: 5000,
    });

    await page.locator(SEL.submitButton).click();

    // Wait for redirect to the list page
    await page.waitForURL(
      (url) => url.href.includes("/dashboard/bookings") && !url.href.includes("/new"),
      { timeout: 15000 },
    );

    // ── Delete phase ────────────────────────────────────────────────
    // Wait for the table to render
    await page.waitForSelector("table", { state: "visible", timeout: 10000 });

    // Handle window.confirm dialog
    page.once("dialog", (dialog) => dialog.accept());

    // Click the first delete button
    await page.locator('[data-testid^="booking-delete-"]').first().click();

    // Handle window.alert success dialog
    page.once("dialog", (dialog) => dialog.accept());

    // Verify the booking is no longer visible
    await expect(page.getByText("Playwright Test Customer Delete")).not.toBeVisible({
      timeout: 10000,
    });
  });
});
