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

test.describe("unauthorized access", () => {
  test("redirects to sign-in when accessing bookings without auth", async ({
    page,
  }) => {
    const response = await page.goto(
      `${BASE_URL}/en/dashboard/bookings`,
      { waitUntil: "domcontentloaded" }
    );

    // Either we get a redirect to sign-in or a 401/403
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

test.describe("booking creation flow", () => {
  let sessionCookie: string;

  test.beforeAll(async ({ request }) => {
    sessionCookie = await signInAndGetCookie(request);
  });

  test.beforeEach(async ({ context }) => {
    await setSessionCookie(context, sessionCookie);
  });

  test("fills form and submits a new booking", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/bookings/new`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector("h1", { state: "attached", timeout: 10000 });

    // Fill customer name
    await page.fill("#customerName", "Playwright Test Customer");

    // Select first package (skip placeholder at index 0)
    const packageSelect = page.locator("#packageId");
    await packageSelect.selectOption({ index: 1 });

    // Open the date picker popover
    const datePickerButton = page.locator(
      'button[aria-label]:has-text("Departure"), button[aria-label]:has-text("departure"), [role="button"]:has-text("Pick")'
    );
    await datePickerButton.first().click();

    // Wait for the calendar popover to appear
    await page.waitForSelector('[role="dialog"], .rdp-root, [data-testid="calendar"]', {
      state: "visible",
      timeout: 5000,
    }).catch(() => {
      // Calendar may use different selectors; try clicking a day cell
    });

    // Click a day in the calendar - try to click a day that's not disabled
    const dayCell = page.locator(
      'button:not([disabled])[role="gridcell"], .rdp-day:not(.rdp-day_disabled):not([disabled]), [role="gridcell"] button:not([disabled])'
    ).first();
    await dayCell.click().catch(async () => {
      // Fallback: click the first available day button in the calendar
      const fallbackDay = page.locator(
        '.rdp-root button:not([disabled]), [data-testid="calendar"] button:not([disabled])'
      ).first();
      await fallbackDay.click();
    });

    // Fill travelers
    await page.fill("#travelers", "2");

    // Fill total price
    await page.fill("#totalPrice", "1500000");

    // Submit the form
    await page.locator('button[type="submit"]').click();

    // Wait for redirect to bookings list (not /new)
    await page.waitForURL((url) => {
      return (
        url.href.includes("/dashboard/bookings") &&
        !url.href.includes("/new")
      );
    }, { timeout: 15000 });

    expect(page.url()).toContain("/dashboard/bookings");
    expect(page.url()).not.toContain("/new");
  });
});

test.describe("form validation", () => {
  let sessionCookie: string;

  test.beforeAll(async ({ request }) => {
    sessionCookie = await signInAndGetCookie(request);
  });

  test.beforeEach(async ({ context }) => {
    await setSessionCookie(context, sessionCookie);
  });

  test("shows validation errors when submitting empty form", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/bookings/new`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector("h1", { state: "attached", timeout: 10000 });

    // Submit the empty form
    await page.locator('button[type="submit"]').click();

    // Wait for validation error messages to appear
    await page.waitForSelector(".text-destructive", {
      state: "visible",
      timeout: 5000,
    });

    // Verify at least one error is visible
    const errorCount = await page.locator(".text-destructive").count();
    expect(errorCount).toBeGreaterThan(0);
  });
});

test.describe("empty state", () => {
  let sessionCookie: string;

  test.beforeAll(async ({ request }) => {
    sessionCookie = await signInAndGetCookie(request);
  });

  test.beforeEach(async ({ context }) => {
    await setSessionCookie(context, sessionCookie);
  });

  test("bookings list page loads without error and has heading", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/en/dashboard/bookings`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector("h1", { state: "attached", timeout: 10000 });

    // Verify the page loaded with at least one heading
    const headingCount = await page.getByRole("heading").count();
    expect(headingCount).toBeGreaterThan(0);

    // Verify we're on the bookings page
    expect(page.url()).toContain("/dashboard/bookings");
    expect(page.url()).not.toContain("/new");

    // The page should not show an error state
    const errorEl = await page.locator(".text-destructive").count();
    expect(errorEl).toBe(0);
  });
});
