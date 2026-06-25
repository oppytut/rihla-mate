import { test, expect } from "@playwright/test";
import { BASE_URL, signInAndGetCookie, setSessionCookie } from "./helpers/auth";

test.describe("Dashboard Overview Page Smoke Test", () => {
  let sessionCookie: string;

  test.beforeAll(async ({ request }) => {
    sessionCookie = await signInAndGetCookie(request);
  });

  test.beforeEach(async ({ context, page }) => {
    await setSessionCookie(context, sessionCookie);
  });

  test("Dashboard overview page renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard`, {
      waitUntil: "domcontentloaded",
    });

    // Wait for the main content heading to be attached (avoids CSS hydration race)
    await page.waitForSelector("h1", { state: "attached", timeout: 10000 });

    // Assert at least one heading exists (sidebar h1 + main h1)
    const headingCount = await page.getByRole("heading").count();
    expect(headingCount).toBeGreaterThan(0);

    // Assert 4 stat cards render (totalBookings, activePackages, totalCustomers, revenue)
    // Stat cards use: bg-card border border-border rounded-lg p-4
    const statCards = page.locator(".bg-card.border.border-border.rounded-lg.p-4");
    await expect(statCards).toHaveCount(4, { timeout: 10000 });

    // Assert sidebar navigation links are present (at least one nav link)
    const navLinks = page.locator("aside nav a");
    await expect(navLinks.first()).toBeAttached({ timeout: 10000 });

    // Assert URL contains /dashboard and does NOT contain /bookings or /packages
    expect(page.url()).toContain("/dashboard");
    expect(page.url()).not.toContain("/bookings");
    expect(page.url()).not.toContain("/packages");
  });
});
