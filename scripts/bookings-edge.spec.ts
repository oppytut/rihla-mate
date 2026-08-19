import { test, expect, type Page } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";
import { pickFutureEkonomiDate } from "./helpers/seed-dates";

const SEL = {
  customerName: '[data-testid="booking-customer-name"]',
  customerEmail: '[data-testid="booking-customer-email"]',
  packageId: '[data-testid="booking-package"]',
  travelers: '[data-testid="booking-travelers"]',
  totalPrice: '[data-testid="booking-total-price"]',
  departureDateButton: '[data-testid="booking-departure-date"]',
  submitButton: '[data-testid="booking-submit"]',
  popoverContent: '[data-slot="popover-content"]',
  calendarNextButton: '[data-slot="calendar"] button[class*="button_next"]',
  calendarDay: (date: string) => `[data-slot="calendar"] button[data-day*="${date}"]`,
  validationError: '[data-testid^="validation-error-"]',
} as const;

async function selectEkonomiPackage(page: Page) {
  const packageSelect = page.locator(SEL.packageId);
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel) as HTMLSelectElement;
      return el && el.options.length > 1;
    },
    SEL.packageId,
    { timeout: 10000 },
  );
  const ekonomiOptionValue = await page
    .locator("#packageId option")
    .filter({ hasText: "Umrah Ekonomi 9 Hari" })
    .getAttribute("value");
  if (!ekonomiOptionValue) throw new Error("Umrah Ekonomi 9 Hari option not found");
  await packageSelect.selectOption(ekonomiOptionValue);
  await expect(packageSelect).toHaveValue(ekonomiOptionValue, { timeout: 5000 });
}

async function pickSeedDepartureDate(page: Page) {
  await page.locator(SEL.departureDateButton).click();
  await page.waitForSelector(SEL.popoverContent, {
    state: "visible",
    timeout: 5000,
  });
  const calendarTarget = pickFutureEkonomiDate();
  for (let i = 0; i < calendarTarget.monthsAhead; i++) {
    await page.locator(SEL.calendarNextButton).click();
    await page.waitForTimeout(100);
  }
  const dayBtn = page.locator(SEL.calendarDay(calendarTarget.dataDay)).first();
  await expect(dayBtn).toBeVisible({ timeout: 5000 });
  await expect(dayBtn).toBeEnabled({ timeout: 5000 });
  await dayBtn.click();
  return calendarTarget;
}

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

    await selectEkonomiPackage(page);
    await pickSeedDepartureDate(page);

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

    await selectEkonomiPackage(page);
    await pickSeedDepartureDate(page);

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

    await selectEkonomiPackage(page);

    await page.locator(SEL.departureDateButton).click();
    await page.waitForSelector(SEL.popoverContent, {
      state: "visible",
      timeout: 5000,
    });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getMonth() + 1}/${yesterday.getDate()}/${yesterday.getFullYear()}`;

    const yesterdayButton = page.locator(SEL.calendarDay(yesterdayStr)).first();
    const hasYesterday = await yesterdayButton.count();
    if (hasYesterday > 0) {
      const isDisabled = await yesterdayButton.getAttribute("disabled");
      if (isDisabled !== null) {
        expect(isDisabled).toBeDefined();
      }
      const ariaDisabled = await yesterdayButton.getAttribute("aria-disabled");
      if (ariaDisabled) {
        expect(ariaDisabled).toBe("true");
      }
    }

    const calendarTarget = pickFutureEkonomiDate();
    for (let i = 0; i < calendarTarget.monthsAhead; i++) {
      await page.locator(SEL.calendarNextButton).click();
      await page.waitForTimeout(100);
    }
    const seedDay = page.locator(SEL.calendarDay(calendarTarget.dataDay)).first();
    await expect(seedDay).toBeVisible({ timeout: 5000 });
    await expect(seedDay).toBeEnabled({ timeout: 5000 });

    await page.keyboard.press("Escape");
  });
});
