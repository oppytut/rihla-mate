import { test, expect } from "@playwright/test";
import { BASE_URL, signInAndGetCookie, setSessionCookie } from "./helpers/auth";

test.describe("booking creation flow", () => {
  let sessionCookie: string;

  test.beforeAll(async ({ request }) => {
    sessionCookie = await signInAndGetCookie(request);
  });

  test.beforeEach(async ({ context }) => {
    await setSessionCookie(context, sessionCookie);
  });

  test("fills form and submits a new booking", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/bookings/new`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector("h1", { state: "attached", timeout: 10000 });

    // Fill customer name
    await page.fill("#customerName", "Playwright Test Customer");

    // Select first package (skip placeholder at index 0)
    const packageSelect = page.locator("#packageId");
    await packageSelect.selectOption({ index: 1 });

    // Open the date picker popover
    const datePickerButton = page.locator(
      'button[aria-label]:has-text("Departure"), button[aria-label]:has-text("departure"), [role="button"]:has-text("Pick")'
    );
    await datePickerButton.first().click();

    // Wait for the calendar popover to appear
    await page.waitForSelector('[role="dialog"], .rdp-root, [data-testid="calendar"]', {
      state: "visible",
      timeout: 5000,
    }).catch(() => {
      // Calendar may use different selectors; try clicking a day cell
    });

    // Click a day in the calendar - try to click a day that's not disabled
    const dayCell = page.locator(
      'button:not([disabled])[role="gridcell"], .rdp-day:not(.rdp-day_disabled):not([disabled]), [role="gridcell"] button:not([disabled])'
    ).first();
    await dayCell.click().catch(async () => {
      // Fallback: click the first available day button in the calendar
      const fallbackDay = page.locator(
        '.rdp-root button:not([disabled]), [data-testid="calendar"] button:not([disabled])'
      ).first();
      await fallbackDay.click();
    });

    // Fill travelers
    await page.fill("#travelers", "2");

    // Fill total price
    await page.fill("#totalPrice", "1500000");

    // Submit the form
    await page.locator('button[type="submit"]').click();

    // Wait for redirect to bookings list (not /new)
    await page.waitForURL((url) => {
      return (
        url.href.includes("/dashboard/bookings") &&
        !url.href.includes("/new")
      );
    }, { timeout: 15000 });

    expect(page.url()).toContain("/dashboard/bookings");
    expect(page.url()).not.toContain("/new");
  });
});

test.describe("form validation", () => {
  let sessionCookie: string;

  test.beforeAll(async ({ request }) => {
    sessionCookie = await signInAndGetCookie(request);
  });

  test.beforeEach(async ({ context }) => {
    await setSessionCookie(context, sessionCookie);
  });

  test("shows validation errors when submitting empty form", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/bookings/new`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector("h1", { state: "attached", timeout: 10000 });

    // Submit the empty form
    await page.locator('button[type="submit"]').click();

    // Wait for validation error messages to appear
    await page.waitForSelector(".text-destructive", {
      state: "visible",
      timeout: 5000,
    });

    // Verify at least one error is visible
    const errorCount = await page.locator(".text-destructive").count();
    expect(errorCount).toBeGreaterThan(0);
  });
});
