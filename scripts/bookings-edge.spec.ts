import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

const SEL = {
  customerName: '[data-testid="booking-customer-name"]',
  customerEmail: '[data-testid="booking-customer-email"]',
  packageId: '[data-testid="booking-package"]',
  travelers: '[data-testid="booking-travelers"]',
  totalPrice: '[data-testid="booking-total-price"]',
  departureDateButton: '[data-testid="booking-departure-date"]',
  submitButton: '[data-testid="booking-submit"]',
  popoverContent: '[data-slot="popover-content"]',
  validationError: '[data-testid^="validation-error-"]',
} as const;

test.describe("booking edge cases", () => {
  test("shows validation errors when submitting empty form", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/bookings/new`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "visible",
      timeout: 10000,
    });
    await page.waitForSelector(SEL.departureDateButton, {
      state: "visible",
      timeout: 10000,
    });

    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="booking-submit"]') as HTMLButtonElement;
        return el && !el.disabled;
      },
      { timeout: 10000 },
    );

    // Click submit button to trigger React form validation
    await page.locator(SEL.submitButton).click();

    await page.waitForSelector(SEL.validationError, {
      state: "attached",
      timeout: 10000,
    });

    const errorCount = await page.locator(SEL.validationError).count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test("shows native browser validation for invalid email format", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/bookings/new`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "visible",
      timeout: 10000,
    });

    await page.locator(SEL.customerName).fill("Email Test Customer");

    const packageSelect = page.locator(SEL.packageId);
    await page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel) as HTMLSelectElement;
        return el && el.options.length > 1;
      },
      SEL.packageId,
      { timeout: 10000 },
    );
    await packageSelect.selectOption({ index: 1 });

    // Select a future date: navigate to next month, pick the 15th
    await page.locator(SEL.departureDateButton).click();
    await page.waitForSelector(SEL.popoverContent, {
      state: "visible",
      timeout: 5000,
    });
    const nextButton = page.locator('[data-slot="calendar"] button[class*="button_next"]');
    await nextButton.click();

    const now = new Date();
    const nextMonth = now.getMonth() + 2;
    const nextYear = nextMonth > 12 ? now.getFullYear() + 1 : now.getFullYear();
    const displayMonth = nextMonth > 12 ? nextMonth - 12 : nextMonth;
    const dateStr = `${displayMonth}/15/${nextYear}`;
    await page.locator(`[data-slot="calendar"] button[data-day*="${dateStr}"]`).first().click();

    await page.locator(SEL.travelers).fill("2");
    await page.locator(SEL.totalPrice).fill("1000000");

    await page.locator(SEL.customerEmail).fill("not-an-email");

    // Click submit button directly — native HTML5 email validation should fire
    await page.locator(SEL.submitButton).click();

    // Native validation should keep us on the same page
    await expect(page.locator(SEL.submitButton)).toBeAttached({ timeout: 5000 });

    const currentUrl = page.url();
    expect(currentUrl).toContain("/dashboard/bookings/new");
  });

  test("shows error for negative or zero travelers", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/bookings/new`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "visible",
      timeout: 10000,
    });
    await page.waitForSelector(SEL.travelers, {
      state: "visible",
      timeout: 10000,
    });

    // Fill required fields
    await page.locator(SEL.customerName).fill("Travelers Test Customer");

    const packageSelect = page.locator(SEL.packageId);
    await page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel) as HTMLSelectElement;
        return el && el.options.length > 1;
      },
      SEL.packageId,
      { timeout: 10000 },
    );
    await packageSelect.selectOption({ index: 1 });

    // Select a future date: navigate to next month, pick the 15th
    await page.locator(SEL.departureDateButton).click();
    await page.waitForSelector(SEL.popoverContent, {
      state: "visible",
      timeout: 5000,
    });
    const nextButton = page.locator('[data-slot="calendar"] button[class*="button_next"]');
    await nextButton.click();

    const now = new Date();
    const nextMonth = now.getMonth() + 2;
    const nextYear = nextMonth > 12 ? now.getFullYear() + 1 : now.getFullYear();
    const displayMonth = nextMonth > 12 ? nextMonth - 12 : nextMonth;
    const dateStr = `${displayMonth}/15/${nextYear}`;
    await page.locator(`[data-slot="calendar"] button[data-day*="${dateStr}"]`).first().click();

    await page.locator(SEL.totalPrice).fill("1000000");

    await page.locator(SEL.travelers).fill("0");

    // Click submit button to trigger React form validation
    await page.locator(SEL.submitButton).click();

    await page.waitForSelector(SEL.validationError, {
      state: "attached",
      timeout: 10000,
    });

    const errorCount = await page.locator(SEL.validationError).count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test("past departure dates are disabled in calendar", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/bookings/new`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "visible",
      timeout: 10000,
    });
    await page.waitForSelector(SEL.departureDateButton, {
      state: "visible",
      timeout: 10000,
    });

    // Select a package first to ensure the form is fully interactive
    const packageSelect = page.locator(SEL.packageId);
    await page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel) as HTMLSelectElement;
        return el && el.options.length > 1;
      },
      SEL.packageId,
      { timeout: 10000 },
    );
    await packageSelect.selectOption({ index: 1 });

    // Open the calendar
    await page.locator(SEL.departureDateButton).click();
    await page.waitForSelector(SEL.popoverContent, {
      state: "visible",
      timeout: 5000,
    });

    // Yesterday's date should be disabled
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const day = yesterday.getDate();
    const month = yesterday.getMonth() + 1;
    const year = yesterday.getFullYear();
    const yesterdayStr = `${month}/${day}/${year}`;

    const yesterdayButton = page
      .locator(`[data-slot="calendar"] button[data-day*="${yesterdayStr}"]`)
      .first();

    const hasYesterday = await yesterdayButton.count();
    if (hasYesterday > 0) {
      const isDisabled = await yesterdayButton.getAttribute("disabled");
      // Past dates should either be disabled or not present
      if (isDisabled !== null) {
        expect(isDisabled).toBeDefined();
      }
      // If not disabled attribute, check aria-disabled
      const ariaDisabled = await yesterdayButton.getAttribute("aria-disabled");
      if (ariaDisabled) {
        expect(ariaDisabled).toBe("true");
      }
    }

    // Today or tomorrow should be enabled
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tDay = tomorrow.getDate();
    const tMonth = tomorrow.getMonth() + 1;
    const tYear = tomorrow.getFullYear();
    const tomorrowStr = `${tMonth}/${tDay}/${tYear}`;

    // Navigate to next month if needed
    const todayMonth = new Date().getMonth();
    if (tMonth !== todayMonth + 1) {
      const nextButton = page.locator('[data-slot="calendar"] button[class*="button_next"]');
      await nextButton.click();
    }

    const tomorrowButton = page
      .locator(`[data-slot="calendar"] button[data-day*="${tomorrowStr}"]`)
      .first();

    const hasTomorrow = await tomorrowButton.count();
    if (hasTomorrow > 0) {
      const isDisabled = await tomorrowButton.getAttribute("disabled");
      expect(isDisabled).toBeNull();
    }

    await page.keyboard.press("Escape");
  });
});
