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
      waitUntil: "load",
    });

    await page.waitForSelector("h1", { state: "visible", timeout: 10000 });

    await page.fill("#customerName", "Playwright Test Customer");

    const packageSelect = page.locator("#packageId");
    await packageSelect.selectOption({ index: 1 });

    await page.locator('button[aria-label="Departure Date"]').click();

    await page.waitForSelector('[data-slot="popover-content"]', {
      state: "visible",
      timeout: 5000,
    });

    // Use a future date (2026-07-01) that exists in all 3 packages' seed data
    // Calendar opens to June 2026, need to navigate to July 2026
    await page.locator('[data-slot="calendar"] button[class*="button_next"]').click();
    await page.locator('[data-slot="calendar"] button[data-day*="7/1/2026"]').first().click();

    await page.fill("#travelers", "2");

    await page.fill("#totalPrice", "1500000");

    await page.locator('button[type="submit"]').click();

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
      waitUntil: "load",
    });

    await page.waitForSelector("h1", { state: "visible", timeout: 10000 });
    await page.waitForSelector('button[aria-label="Departure Date"]', { state: "visible", timeout: 10000 });

    // Confirm React hydration: open date picker, verify popover, close it
    await page.locator('button[aria-label="Departure Date"]').click();
    await page.waitForSelector('[data-slot="popover-content"]', { state: "visible", timeout: 5000 });
    await page.keyboard.press("Escape");
    await page.waitForSelector('[data-slot="popover-content"]', { state: "hidden", timeout: 5000 });

    // Submit via JavaScript to avoid native form submission race
    await page.evaluate(() => {
      const form = document.querySelector("form");
      if (!form) throw new Error("Form not found");
      form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    });

    await page.waitForSelector(".text-destructive", {
      state: "attached",
      timeout: 10000,
    });

    const errorCount = await page.locator(".text-destructive").count();
    expect(errorCount).toBeGreaterThan(0);
  });
});
