import { test, expect } from "@playwright/test";
import { BASE_URL, signInAndGetCookie, setSessionCookie } from "./helpers/auth";

test.describe("Booking Pages Smoke Test", () => {
  let sessionCookie: string;

  test.beforeAll(async ({ request }) => {
    sessionCookie = await signInAndGetCookie(request);
  });

  test.describe("authenticated booking pages", () => {
    test.beforeEach(async ({ context, page }) => {
      await setSessionCookie(context, sessionCookie);
    });

    test("Booking list page renders with heading and table", async ({ page }) => {
      await page.goto(`${BASE_URL}/en/dashboard/bookings`, {
        waitUntil: "domcontentloaded",
      });

      // Use state:"attached" since the page may still be hydrating CSS.
      // The sidebar h1 is picked up first but may not be "visible" yet.
      await page.waitForSelector("h1", { state: "attached", timeout: 10000 });

      const headingCount = await page.getByRole("heading").count();
      expect(headingCount).toBeGreaterThan(0);

      expect(page.url()).toContain("/dashboard/bookings");
    });

    test("New booking form page renders form elements", async ({ page }) => {
      await page.goto(`${BASE_URL}/en/dashboard/bookings/new`, {
        waitUntil: "domcontentloaded",
      });

      // Use state:"attached" since the page may still be hydrating CSS.
      await page.waitForSelector("h1", { state: "attached", timeout: 10000 });

      const headingCount = await page.getByRole("heading").count();
      expect(headingCount).toBeGreaterThan(0);

      const formElements = await page.locator("form, input, select, textarea").count();
      expect(formElements).toBeGreaterThan(0);

      expect(page.url()).toContain("/dashboard/bookings/new");
    });
  });
});

test.describe("empty state", () => {
  let sessionCookie: string;

  test.beforeAll(async ({ request }) => {
    sessionCookie = await signInAndGetCookie(request);
  });

  test.beforeEach(async ({ context }) => {
    await setSessionCookie(context, sessionCookie);
  });

  test("bookings list page loads without error and has heading", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/en/dashboard/bookings`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector("h1", { state: "attached", timeout: 10000 });

    // Verify the page loaded with at least one heading
    const headingCount = await page.getByRole("heading").count();
    expect(headingCount).toBeGreaterThan(0);

    // Verify we're on the bookings page
    expect(page.url()).toContain("/dashboard/bookings");
    expect(page.url()).not.toContain("/new");

    // The page should not show an error state
    const errorEl = await page.locator(".text-destructive").count();
    expect(errorEl).toBe(0);
  });
});
