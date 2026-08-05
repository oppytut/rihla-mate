import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";
import { waitForPageHeading } from "./helpers/ready";

test.describe("Customers Page Smoke Test", () => {
  test("Customers page renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/customers`, {
      waitUntil: "domcontentloaded",
    });

    await waitForPageHeading(page);

    expect(page.url()).toContain("/dashboard/customers");
  });
});

test.describe("unauthorized access", () => {
  test("customers page redirects to sign-in without auth", async ({ browser }) => {
    // Isolated context — no storageState cookies (do not poison shared fixture).
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/en/dashboard/customers`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForURL("**/sign-in", { timeout: 15000 });
    expect(page.url()).toContain("/sign-in");

    await context.close();
  });
});
