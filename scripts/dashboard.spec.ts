import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";
import { waitForPageHeading } from "./helpers/ready";

test.describe("Dashboard Overview Page Smoke Test", () => {
  test("Dashboard overview page renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard`, {
      waitUntil: "domcontentloaded",
    });

    await waitForPageHeading(page);

    const statCards = page.locator('[data-testid^="stat-card-"]');
    await expect(statCards).toHaveCount(4, { timeout: 10000 });

    const navLinks = page.locator('[data-testid^="sidebar-link-"]');
    await expect(navLinks.first()).toBeVisible({ timeout: 10000 });

    expect(page.url()).toContain("/dashboard");
    expect(page.url()).not.toContain("/bookings");
    expect(page.url()).not.toContain("/packages");
  });
});
