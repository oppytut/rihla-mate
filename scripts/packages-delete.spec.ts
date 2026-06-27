import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

const SEL = {
  title: '[data-testid="package-title"]',
  slug: '[data-testid="package-slug"]',
  description: '[data-testid="package-description"]',
  category: '[data-testid="package-category"]',
  durationDays: '[data-testid="package-duration-days"]',
  departureCity: '[data-testid="package-departure-city"]',
  status: '[data-testid="package-status"]',
  price: '[data-testid="package-price"]',
  currency: '[data-testid="package-currency"]',
  featuredImage: '[data-testid="package-featured-image"]',
  gallery: '[data-testid="package-gallery"]',
  itinerary: '[data-testid="package-itinerary"]',
  inclusions: '[data-testid="package-inclusions"]',
  exclusions: '[data-testid="package-exclusions"]',
  availableDates: '[data-testid="package-available-dates"]',
  submit: '[data-testid="package-submit"]',
} as const;

test.describe("package delete flow", () => {
  test("creates a package then deletes it from the list", async ({ page }) => {
    // ── Create phase ────────────────────────────────────────────────
    await page.goto(`${BASE_URL}/en/dashboard/packages/new`, {
      waitUntil: "load",
    });

    await page.waitForSelector('[data-testid="page-heading"]', { state: "visible", timeout: 10000 });

    await page.fill(SEL.title, "Playwright Test Delete");
    await page.fill(SEL.slug, "playwright-test-delete");
    await page.fill(SEL.description, "Package created for delete test");
    await page.selectOption(SEL.category, "premium");
    await page.fill(SEL.durationDays, "3");
    await page.fill(SEL.departureCity, "Surabaya");
    await page.selectOption(SEL.status, "published");
    await page.fill(SEL.price, "1000000");
    await page.selectOption(SEL.currency, "IDR");
    await page.fill(SEL.featuredImage, "https://example.com/delete-test.jpg");
    await page.fill(SEL.gallery, '["https://example.com/gallery-delete.jpg"]');
    await page.fill(
      SEL.itinerary,
      '[{"day": 1, "description": "Delete test day"}]',
    );
    await page.fill(SEL.inclusions, '["Meal"]');
    await page.fill(SEL.exclusions, '["Transport"]');
    await page.fill(SEL.availableDates, '["2026-09-01"]');

    await page.locator(SEL.submit).click();

    // Wait for redirect to the list page
    await page.waitForURL(
      (url) =>
        url.href.includes("/dashboard/packages") &&
        !url.href.includes("/new"),
      { timeout: 15000 },
    );

    // ── Delete phase ────────────────────────────────────────────────
    await page.waitForSelector("table", { state: "visible", timeout: 10000 });

    page.once("dialog", (dialog) => dialog.accept());

    await page.locator('[data-testid^="package-delete-"]').first().click();

    page.once("dialog", (dialog) => dialog.accept());

    await expect(
      page.getByText("Playwright Test Delete"),
    ).not.toBeVisible({ timeout: 10000 });
  });
});
