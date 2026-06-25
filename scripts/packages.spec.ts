import { test, expect } from "@playwright/test";
import { BASE_URL, signInAndGetCookie, setSessionCookie } from "./helpers/auth";

test.describe("Packages List Page Smoke Test", () => {
  let sessionCookie: string;

  test.beforeAll(async ({ request }) => {
    sessionCookie = await signInAndGetCookie(request);
  });

  test.beforeEach(async ({ context, page }) => {
    await setSessionCookie(context, sessionCookie);
  });

  test("Packages list page renders", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/packages`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector("h1", { state: "attached", timeout: 10000 });

    const headingCount = await page.getByRole("heading").count();
    expect(headingCount).toBeGreaterThan(0);

    const searchInput = page.locator('input[type="text"]');
    await expect(searchInput).toBeAttached({ timeout: 10000 });

    const hasTable = page.locator("table");
    const hasSkeleton = page.locator(".animate-pulse");
    const tableOrSkeleton = hasTable.or(hasSkeleton);
    await expect(tableOrSkeleton.first()).toBeAttached({ timeout: 10000 });

    expect(page.url()).toContain("/dashboard/packages");
  });
});

test.describe("unauthorized access", () => {
  test("redirects to sign-in when accessing packages without auth", async ({
    page,
  }) => {
    const response = await page.goto(
      `${BASE_URL}/en/dashboard/packages`,
      { waitUntil: "domcontentloaded" }
    );

    const isRedirected =
      page.url().includes("/sign-in") ||
      page.url().includes("/login") ||
      page.url().includes("/auth");
    const isDenied =
      response !== null &&
      (response.status() === 401 || response.status() === 403);

    expect(isRedirected || isDenied).toBe(true);
  });
});
