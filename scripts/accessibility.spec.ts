import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

/**
 * Scan the current page for accessibility violations using axe-core.
 * Fails the test if any violations of severity "critical" or "serious" are found.
 */
async function accessibilityScan(page: import("@playwright/test").Page) {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const results = await new AxeBuilder({ page })
    .options({
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      rules: { "html-has-lang": { enabled: false } },
    })
    .analyze();
  const violations = results.violations.filter(
    (v: { impact?: string }) => v.impact === "critical" || v.impact === "serious"
  );
  expect(violations).toHaveLength(0);
}

const PAGES = [
  { name: "dashboard", path: "/en/dashboard" },
  { name: "bookings list", path: "/en/dashboard/bookings" },
  { name: "packages list", path: "/en/dashboard/packages" },
  { name: "bookings create", path: "/en/dashboard/bookings/new" },
  { name: "packages create", path: "/en/dashboard/packages/new" },
] as const;

test.describe("accessibility scan", () => {
  for (const { name, path } of PAGES) {
    test(`${name} page should have no critical or serious violations`, async ({ page }) => {
      await page.goto(`${BASE_URL}${path}`, {
        waitUntil: "domcontentloaded",
      });

      // Wait for the page to render at least one heading before scanning
      await page.waitForSelector('[data-testid="page-heading"]', { state: "attached", timeout: 10000 });

      await accessibilityScan(page);
    });
  }
});
