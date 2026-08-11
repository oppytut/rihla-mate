import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";
import { waitForPageHeading } from "./helpers/ready";

test.describe("Users Page Smoke Test", () => {
  test("Users page renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/users`, {
      waitUntil: "domcontentloaded",
    });

    await waitForPageHeading(page);

    expect(page.url()).toContain("/dashboard/users");
    await expect(page.getByTestId("users-add")).toBeVisible();
    await expect(page.getByTestId("users-invite")).toBeVisible();
    await expect(page.getByTestId("users-search")).toBeVisible();
  });

  test("Invite form opens without password field", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/users`, {
      waitUntil: "domcontentloaded",
    });
    await waitForPageHeading(page);
    await page.getByTestId("users-invite").click();
    await expect(page.getByTestId("users-form")).toBeVisible();
    await expect(page.getByTestId("users-invite-hint")).toBeVisible();
    await expect(page.getByTestId("users-form-password")).toHaveCount(0);
  });

  test("Resend invite action is available on user rows", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/users`, {
      waitUntil: "domcontentloaded",
    });
    await waitForPageHeading(page);
    const table = page.getByTestId("users-table");
    await expect(table).toBeVisible({ timeout: 15000 });
    const resend = page.locator("[data-testid^='users-resend-invite-']").first();
    await expect(resend).toBeVisible();
  });
});

test.describe("unauthorized access", () => {
  test("users page redirects to sign-in without auth", async ({ browser }) => {
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/en/dashboard/users`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForURL("**/sign-in", { timeout: 15000 });
    expect(page.url()).toContain("/sign-in");

    await context.close();
  });
});
