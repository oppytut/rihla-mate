import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

/**
 * Visual regression tests using Playwright's built-in screenshot comparison.
 *
 * Run with: npx playwright test scripts/visual-regression.spec.ts
 * On first run, screenshots are saved as golden references.
 * On subsequent runs, screenshots are compared against the reference.
 *
 * To update reference screenshots: npx playwright test scripts/visual-regression.spec.ts --update-snapshots
 */

const PAGES = [
  { name: "dashboard", path: "/en/dashboard" },
  { name: "bookings-list", path: "/en/dashboard/bookings" },
  { name: "packages-list", path: "/en/dashboard/packages" },
  { name: "bookings-create", path: "/en/dashboard/bookings/new" },
  { name: "packages-create", path: "/en/dashboard/packages/new" },
] as const;

test.describe("visual regression", () => {
  test.describe.configure({ mode: "serial" });

  for (const { name, path } of PAGES) {
    test(`${name} page screenshot matches reference`, async ({ page }) => {
      await page.goto(`${BASE_URL}${path}`, {
        waitUntil: "domcontentloaded",
      });

      await page.waitForSelector('[data-testid="page-heading"]', {
        state: "visible",
        timeout: 15000,
      });

      // Wait for page data to actually load, not just the heading skeleton.
      // The heading is always visible, but data loads asynchronously via tRPC.
      // Waiting for a data-specific element ensures we capture the real page,
      // not the loading skeleton — critical for CI where queries are slower.
      await page.waitForSelector(
        '[data-testid$="-page-info"], [data-testid$="-add-new-empty"], [data-testid$="-clear-filters"], [data-testid$="-submit"], [data-testid^="stat-card-"]',
        { state: "visible", timeout: 15000 },
      );

      // Ensure any skeleton loaders or animations have resolved before screenshot
      await page.waitForFunction(
        () => {
          const skeletons = document.querySelectorAll(".animate-pulse");
          return skeletons.length === 0;
        },
        { timeout: 10000 },
      );

      await expect(page).toHaveScreenshot(`${name}.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.05,
      });
    });
  }
});
