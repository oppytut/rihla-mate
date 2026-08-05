import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";
import { waitForPageHeading } from "./helpers/ready";

test.describe("Booking Pages Smoke Test", () => {
  test.describe("authenticated booking pages", () => {
    test("Booking list page renders with heading and table", async ({ page }) => {
      await page.goto(`${BASE_URL}/en/dashboard/bookings`, {
        waitUntil: "domcontentloaded",
      });

      await waitForPageHeading(page);

      expect(page.url()).toContain("/dashboard/bookings");
    });

    test("New booking form page renders form elements", async ({ page }) => {
      await page.goto(`${BASE_URL}/en/dashboard/bookings/new`, {
        waitUntil: "domcontentloaded",
      });

      await waitForPageHeading(page);

      const formElements = await page.locator('[data-testid^="booking-"]').count();
      expect(formElements).toBeGreaterThan(0);

      expect(page.url()).toContain("/dashboard/bookings/new");
    });
  });
});

test.describe("empty state", () => {
  test("bookings list page loads without error and has heading", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/bookings`, {
      waitUntil: "domcontentloaded",
    });

    await waitForPageHeading(page);

    expect(page.url()).toContain("/dashboard/bookings");
    expect(page.url()).not.toContain("/new");

    const errorEl = await page.locator('[data-testid^="validation-error-"]').count();
    expect(errorEl).toBe(0);
  });
});
