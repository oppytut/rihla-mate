import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

const SEL = {
  customerName: '[data-testid="booking-customer-name"]',
  packageId: '[data-testid="booking-package"]',
  travelers: '[data-testid="booking-travelers"]',
  totalPrice: '[data-testid="booking-total-price"]',
  departureDateButton: '[data-testid="booking-departure-date"]',
  submitButton: '[data-testid="booking-submit"]',
  popoverContent: '[data-slot="popover-content"]',
  calendarNextButton: '[data-slot="calendar"] button[class*="button_next"]',
  calendarDay: (date: string) => `[data-slot="calendar"] button[data-day*="${date}"]`,
  validationError: '[data-testid^="validation-error-"]',
} as const;

/**
 * Delete all bookings whose customerName matches `searchTerm`.
 *
 * Uses `context.request` so the API calls share the browser context's
 * auth cookies from storageState (the global request fixture does NOT).
 */
async function cleanupPlaywrightBookings(context: {
  request: {
    post: (
      url: string,
      options?: { data: Record<string, unknown> },
    ) => Promise<{ ok: () => boolean; json: () => Promise<unknown> }>;
  };
}) {
  const api = context.request;
  try {
    const listRes = await api.post(`${BASE_URL}/api/trpc/bookings.list`, {
      data: { json: { search: "Playwright Test Customer" } },
    });
    if (!listRes.ok()) return;

    const body = (await listRes.json()) as {
      result?: {
        data?: { items?: Array<{ id: string }> };
        json?: { items?: Array<{ id: string }> };
      };
    };
    const result = body?.[0] as
      | {
          result?: {
            data?: { items?: Array<{ id: string }>; json?: { items?: Array<{ id: string }> } };
          };
        }
      | undefined;
    const items: Array<{ id: string }> =
      result?.result?.data?.items ?? result?.result?.data?.json?.items ?? [];
    for (const item of items) {
      if (item.id) {
        await api
          .post(`${BASE_URL}/api/trpc/bookings.delete`, { data: { json: { id: item.id } } })
          .catch(() => {
            // cleanup may fail if booking doesn't exist — ignore
          });
      }
    }
  } catch {
    // list may fail if no bookings exist — ignore
  }
}

test.describe("booking creation flow", () => {
  test.beforeEach(async ({ context }) => {
    await cleanupPlaywrightBookings(context);
  });

  test("fills form and submits a new booking", async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(`${BASE_URL}/en/dashboard/bookings/new`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "visible",
      timeout: 10000,
    });

    // Ensure the React-controlled input is hydrated before filling
    const customerNameInput = page.locator(SEL.customerName);
    await customerNameInput.waitFor({ state: "visible", timeout: 10000 });
    await page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel) as HTMLInputElement;
        return el && !el.disabled;
      },
      SEL.customerName,
      { timeout: 10000 },
    );
    await customerNameInput.pressSequentially("Playwright Test Customer", { delay: 30 });

    // Wait for the specific package option to be available in the DOM before selecting.
    // waitForFunction(options.length > 1) can race against React re-renders.
    await page
      .locator('#packageId option[value]:not([value=""])')
      .first()
      .waitFor({ state: "attached", timeout: 15000 });
    // Give the select one more beat to fully stabilize after TRPC data lands
    await page.waitForTimeout(500);
    await page.locator(SEL.packageId).selectOption({ label: "Bali Sacred Temples" });

    await page.locator(SEL.departureDateButton).click();
    await page.waitForSelector(SEL.popoverContent, {
      state: "visible",
      timeout: 5000,
    });

    const monthsAhead = (2026 - new Date().getFullYear()) * 12 + (8 - (new Date().getMonth() + 1));
    for (let i = 0; i < monthsAhead; i++) {
      await page.locator(SEL.calendarNextButton).click();
      await page.waitForTimeout(100);
    }
    await page.locator(SEL.calendarDay("8/1/2026")).first().click();

    await page.fill(SEL.travelers, "2");
    await page.fill(SEL.totalPrice, "1500000");

    // Accept any alert dialog (success or error) that appears after submit
    page.on("dialog", (dialog) => dialog.accept());

    await page.locator(SEL.submitButton).click();

    // Wait for navigation to the bookings list page after successful create.
    // The mutation triggers window.alert() then router.push("/dashboard/bookings").
    // Use waitForURL to avoid race conditions with page.url().
    await page.waitForURL("**/dashboard/bookings", { timeout: 15000 });
    // Ensure the URL does NOT contain /new (it should be /dashboard/bookings or /dashboard/bookings?page=...)
    expect(page.url()).not.toContain("/new");
  });
});

test.describe("form validation", () => {
  test("shows validation errors when submitting empty form", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/bookings/new`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "visible",
      timeout: 10000,
    });
    await page.waitForSelector(SEL.departureDateButton, {
      state: "visible",
      timeout: 10000,
    });

    // Confirm React hydration before interacting with the form
    await page.waitForTimeout(3000);

    // Click submit button to trigger React form validation
    await page.locator(SEL.submitButton).click();

    await page.waitForSelector(SEL.validationError, {
      state: "attached",
      timeout: 10000,
    });

    const errorCount = await page.locator(SEL.validationError).count();
    expect(errorCount).toBeGreaterThan(0);
  });
});
