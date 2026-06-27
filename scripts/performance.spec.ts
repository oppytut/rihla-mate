import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

/**
 * Performance E2E tests — measure page load times and verify they stay
 * within acceptable thresholds.
 *
 * These are NOT benchmarks; they are smoke tests that catch catastrophic
 * regressions. Thresholds are deliberately generous.
 */

const MAX_LOAD_TIME_MS = 15_000;
const MAX_FCP_MS = 5_000;
const MAX_LCP_MS = 8_000;

interface PageMetrics {
  name: string;
  path: string;
  hasDynamicData?: boolean;
}

const PAGES: PageMetrics[] = [
  { name: "dashboard", path: "/en/dashboard" },
  { name: "bookings-list", path: "/en/dashboard/bookings", hasDynamicData: true },
  { name: "packages-list", path: "/en/dashboard/packages", hasDynamicData: true },
  { name: "bookings-create", path: "/en/dashboard/bookings/new", hasDynamicData: true },
  { name: "packages-create", path: "/en/dashboard/packages/new", hasDynamicData: true },
];

test.describe("performance", () => {
  for (const { name, path, hasDynamicData } of PAGES) {
    test(`${name} page loads within time threshold`, async ({ page }) => {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}${path}`, {
        waitUntil: "domcontentloaded",
      });

      await page.waitForSelector('[data-testid="page-heading"]', {
        state: "visible",
        timeout: MAX_LOAD_TIME_MS,
      });

      const loadTime = Date.now() - startTime;

      const threshold = hasDynamicData
        ? MAX_LOAD_TIME_MS * 1.5
        : MAX_LOAD_TIME_MS;

      expect(loadTime).toBeLessThan(threshold);
    });
  }

  test("dashboard stat cards render without blocking layout", async ({
    page,
  }) => {
    const startTime = Date.now();

    await page.goto(`${BASE_URL}/en/dashboard`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "visible",
      timeout: MAX_LOAD_TIME_MS,
    });

    await expect(page.locator('[data-testid="stat-card-0"]')).toBeVisible({
      timeout: MAX_FCP_MS,
    });

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(MAX_LOAD_TIME_MS);

    const statCards = page.locator('[data-testid^="stat-card-"]');
    await expect(statCards).toHaveCount(4, { timeout: 5000 });
  });

  test("sidebar navigation renders immediately on dashboard load", async ({
    page,
  }) => {
    const startTime = Date.now();

    await page.goto(`${BASE_URL}/en/dashboard`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator('[data-testid="sidebar-nav"]')).toBeVisible({
      timeout: MAX_FCP_MS,
    });

    const sidebarTime = Date.now() - startTime;
    expect(sidebarTime).toBeLessThan(MAX_FCP_MS);
  });

  test("bookings list page renders table or empty state", async ({ page }) => {
    const startTime = Date.now();

    await page.goto(`${BASE_URL}/en/dashboard/bookings`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "visible",
      timeout: MAX_LOAD_TIME_MS,
    });

    const table = page.locator("table");
    const emptyState = page.locator('[data-testid="bookings-add-new-empty"]');

    await expect(table.or(emptyState).first()).toBeAttached({
      timeout: MAX_LCP_MS,
    });

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(MAX_LOAD_TIME_MS * 1.5);
  });

  test("packages list page renders table or empty state", async ({ page }) => {
    const startTime = Date.now();

    await page.goto(`${BASE_URL}/en/dashboard/packages`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "visible",
      timeout: MAX_LOAD_TIME_MS,
    });

    const table = page.locator("table");
    const emptyState = page.locator('[data-testid="packages-add-new-empty"]');

    await expect(table.or(emptyState).first()).toBeAttached({
      timeout: MAX_LCP_MS,
    });

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(MAX_LOAD_TIME_MS * 1.5);
  });
});
