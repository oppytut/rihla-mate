import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

test.describe("Dashboard Overview Page Smoke Test", () => {
  test("Dashboard overview page renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="page-heading"]', { state: "attached", timeout: 10000 });

    const headingCount = await page.getByRole("heading").count();
    expect(headingCount).toBeGreaterThan(0);

    const statCards = page.locator('[data-testid^="stat-card-"]');
    await expect(statCards).toHaveCount(4, { timeout: 10000 });

    const navLinks = page.locator('[data-testid^="sidebar-link-"]');
    await expect(navLinks.first()).toBeAttached({ timeout: 10000 });

    expect(page.url()).toContain("/dashboard");
    expect(page.url()).not.toContain("/bookings");
    expect(page.url()).not.toContain("/packages");
  });
});
