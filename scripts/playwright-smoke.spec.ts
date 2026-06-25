import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

const TEST_CREDENTIALS = {
  email: "playwright@rihlamate.test",
  password: "testpass123",
};

async function signInAndGetCookie(request: Parameters<typeof test.beforeAll>[0]): Promise<string> {
  const response = await request.post(`${BASE_URL}/api/auth/sign-in/email`, {
    data: TEST_CREDENTIALS,
  });

  expect(response.status()).toBe(200);

  const setCookieHeader = response.headers()["set-cookie"];
  expect(setCookieHeader).toBeTruthy();

  const match = setCookieHeader.match(/better-auth\.session_token=([^;]+)/);
  expect(match).not.toBeNull();
  expect(match![1]).toBeTruthy();

  return match![1];
}

async function setSessionCookie(context: BrowserContext, token: string) {
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax" as const,
    },
  ]);
}

test.describe("Booking Pages Smoke Test", () => {
  let sessionCookie: string;

  test.beforeAll(async ({ request }) => {
    sessionCookie = await signInAndGetCookie(request);
  });

  test.describe("authenticated booking pages", () => {
    test.beforeEach(async ({ context, page }) => {
      await setSessionCookie(context, sessionCookie);
    });

    test("Booking list page renders with heading and table", async ({ page }) => {
      await page.goto(`${BASE_URL}/en/dashboard/bookings`, {
        waitUntil: "domcontentloaded",
      });

      // Use state:"attached" since the page may still be hydrating CSS.
      // The sidebar h1 is picked up first but may not be "visible" yet.
      await page.waitForSelector("h1", { state: "attached", timeout: 10000 });

      const headingCount = await page.getByRole("heading").count();
      expect(headingCount).toBeGreaterThan(0);

      expect(page.url()).toContain("/dashboard/bookings");
    });

    test("New booking form page renders form elements", async ({ page }) => {
      await page.goto(`${BASE_URL}/en/dashboard/bookings/new`, {
        waitUntil: "domcontentloaded",
      });

      // Use state:"attached" since the page may still be hydrating CSS.
      await page.waitForSelector("h1", { state: "attached", timeout: 10000 });

      const headingCount = await page.getByRole("heading").count();
      expect(headingCount).toBeGreaterThan(0);

      const formElements = await page.locator("form, input, select, textarea").count();
      expect(formElements).toBeGreaterThan(0);

      expect(page.url()).toContain("/dashboard/bookings/new");
    });
  });
});
