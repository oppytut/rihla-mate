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

      const threshold = hasDynamicData ? MAX_LOAD_TIME_MS * 1.5 : MAX_LOAD_TIME_MS;

      expect(loadTime).toBeLessThan(threshold);
    });
  }

  test("dashboard stat cards render without blocking layout", async ({ page }) => {
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

  test("sidebar navigation renders immediately on dashboard load", async ({ page }) => {
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

    await expect(table.or(emptyState).first()).toBeVisible({
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

    await expect(table.or(emptyState).first()).toBeVisible({
      timeout: MAX_LCP_MS,
    });

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(MAX_LOAD_TIME_MS * 1.5);
  });

  test("client-side navigation between dashboard pages is fast", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "visible",
      timeout: MAX_LOAD_TIME_MS,
    });

    const navStart = Date.now();

    await page.click('[data-testid="sidebar-nav"] a[href*="bookings"]');
    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "visible",
      timeout: MAX_LOAD_TIME_MS,
    });

    const navTime = Date.now() - navStart;
    expect(navTime).toBeLessThan(MAX_FCP_MS * 2);
  });

  test("API response time is within threshold", async ({ page }) => {
    let maxApiTime = 0;

    page.on("response", (response) => {
      if (response.url().includes("/api/trpc/") && response.status() === 200) {
        const timing = response.request().timing();
        if (timing.responseEnd > 0) {
          maxApiTime = Math.max(maxApiTime, timing.responseEnd);
        }
      }
    });

    await page.goto(`${BASE_URL}/en/dashboard`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "visible",
      timeout: MAX_LOAD_TIME_MS,
    });

    await page.waitForSelector('[data-testid^="stat-card-"]', {
      state: "visible",
      timeout: MAX_LCP_MS,
    });

    expect(maxApiTime).toBeLessThan(MAX_LOAD_TIME_MS);
  });

  test("Web Vitals are within acceptable range", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "visible",
      timeout: MAX_LOAD_TIME_MS,
    });

    await page.waitForSelector('[data-testid^="stat-card-"]', {
      state: "visible",
      timeout: MAX_LCP_MS,
    });

    const metrics = await page.evaluate(() => {
      const navEntries = performance.getEntriesByType(
        "navigation",
      ) as PerformanceNavigationTiming[];
      const nav = navEntries[0];
      const paintEntries = performance.getEntriesByType("paint");
      const fcp = paintEntries.find((e) => e.name === "first-contentful-paint")?.startTime;
      return {
        domContentLoaded: nav?.domContentLoadedEventEnd ?? 0,
        domInteractive: nav?.domInteractive ?? 0,
        fcp: fcp ?? 0,
      };
    });

    expect(metrics.domContentLoaded).toBeLessThan(MAX_LOAD_TIME_MS);
    expect(metrics.domInteractive).toBeLessThan(MAX_LOAD_TIME_MS);
    expect(metrics.fcp).toBeLessThan(MAX_FCP_MS);
  });
});
