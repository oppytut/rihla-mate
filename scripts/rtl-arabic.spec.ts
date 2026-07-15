import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

test.describe("RTL and Arabic locale", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean state — clear any cached locale preference
    await page.context().clearCookies();
  });

  test("HTML dir and lang attributes", async ({ page }) => {
    await page.goto(`${BASE_URL}/ar`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    await page.goto(`${BASE_URL}/en`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("lang", "id");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });

  test("Arabic text rendering", async ({ page }) => {
    await page.goto(`${BASE_URL}/ar/marketing`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const bodyText = await page.locator("body").innerText();
    const arabicRegex = /[\u0600-\u06FF]/;
    expect(bodyText).toMatch(arabicRegex);
  });

  test("Cairo font loading", async ({ page }) => {
    await page.goto(`${BASE_URL}/ar`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");

    const fontCairo = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--font-cairo"),
    );
    expect(fontCairo.trim()).not.toBe("");
  });

  test("RTL layout integrity (no overlapping)", async ({ page }) => {
    await page.goto(`${BASE_URL}/ar/marketing`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Assert no horizontal scrollbar (RTL layout should fit viewport)
    const noHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(noHorizontalScroll).toBe(true);
  });

  test("Locale switching preserves RTL", async ({ page }) => {
    await page.goto(`${BASE_URL}/ar`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    await page.goto(`${BASE_URL}/en`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

    await page.goto(`${BASE_URL}/ar`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("Marketing page RTL layout", async ({ page }) => {
    await page.goto(`${BASE_URL}/ar/marketing`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Verify the page has visible heading content
    const headingCount = await page.locator("h1, h2, h3").count();
    expect(headingCount).toBeGreaterThan(0);

    // Verify at least one heading is visible
    await expect(page.locator("h1, h2, h3").first()).toBeVisible();
  });
});
