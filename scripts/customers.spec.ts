import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

test.describe("Customers Page Smoke Test", () => {
  test("Customers page renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/customers`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "attached",
      timeout: 10000,
    });

    const headingCount = await page.getByRole("heading").count();
    expect(headingCount).toBeGreaterThan(0);

    expect(page.url()).toContain("/dashboard/customers");
  });
});

test.describe("unauthorized access", () => {
  test("customers page renders even without auth (no guard implemented)", async ({ browser }) => {
    // IMPORTANT: Use an isolated browser context (no storageState cookies)
    // so that clearing auth does NOT pollute the shared page fixture.
    // With workers: 1, using the shared page would poison ALL subsequent tests.
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/en/dashboard/customers`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "attached",
      timeout: 10000,
    });
    await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible();
    expect(page.url()).toContain("/dashboard/customers");

    await context.close();
  });
});
