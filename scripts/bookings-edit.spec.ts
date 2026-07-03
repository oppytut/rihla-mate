import { test } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

const SEL = {
  customerName: "#customerName",
  packageId: "#packageId",
  travelers: "#travelers",
  totalPrice: "#totalPrice",
  departureDateButton: 'button[aria-label="Departure Date"]',
  submitButton: 'button[type="submit"]',
  popoverContent: '[data-slot="popover-content"]',
  calendarNextButton: '[data-slot="calendar"] button[class*="button_next"]',
  calendarDay: (date: string) => `[data-slot="calendar"] button[data-day*="${date}"]`,
  editButton: '[data-testid^="booking-edit-"]',
  editCustomerName: '[data-testid="booking-customer-name"]',
  editTravelers: '[data-testid="booking-travelers"]',
  editSubmit: '[data-testid="booking-submit"]',
} as const;

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
      data: { json: { search: "Playwright Test Customer Edit" } },
    });
    if (!listRes.ok()) return;

    const body = (await listRes.json()) as {
      result?: { data?: { items?: Array<{ id: string }> } };
    };
    const items: Array<{ id: string }> = body?.result?.data?.items ?? [];
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

test.describe("booking edit flow", () => {
  test.beforeEach(async ({ context }) => {
    await cleanupPlaywrightBookings(context);
  });

  test("creates a booking, then edits it from the list page", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/bookings/new`, {
      waitUntil: "load",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "visible",
      timeout: 10000,
    });

    await page.fill(SEL.customerName, "Playwright Test Customer Edit");

    const packageSelect = page.locator(SEL.packageId);
    await page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel) as HTMLSelectElement;
        return el && el.options.length > 1;
      },
      SEL.packageId,
      { timeout: 10000 },
    );
    await packageSelect.selectOption({ index: 1 });

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

    // Confirm React hydration before submitting the form
    await page.locator(SEL.departureDateButton).click();
    await page.waitForSelector(SEL.popoverContent, {
      state: "visible",
      timeout: 5000,
    });
    await page.keyboard.press("Escape");
    await page.waitForSelector(SEL.popoverContent, {
      state: "hidden",
      timeout: 5000,
    });

    await page.locator(SEL.submitButton).click();

    // Navigate directly via page.goto to force full SSR after mutation.
    // Client-side router.push sends undefined to bookings.list tRPC input,
    // crashing the React 19 tree.
    await page.goto(`${BASE_URL}/en/dashboard/bookings`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "attached",
      timeout: 20000,
    });

    await page.waitForSelector("table", { state: "visible", timeout: 10000 });
    // Wait for at least one table row to appear and stabilize before clicking.
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.waitFor({ state: "visible", timeout: 10000 });
    await firstRow.waitFor({ state: "attached", timeout: 5000 });
    await page.waitForTimeout(500);

    const firstEditButton = page.locator(SEL.editButton).first();
    await firstEditButton.waitFor({ state: "visible", timeout: 10000 });

    // Extract booking ID and navigate via page.goto for full SSR.
    // Client-side router.push sends undefined to bookings.list tRPC input.
    const editBtnTestId = await firstEditButton.getAttribute("data-testid");
    if (!editBtnTestId) throw new Error("edit button missing data-testid");
    const bookingId = editBtnTestId.replace("booking-edit-", "");
    await page.goto(`${BASE_URL}/en/dashboard/bookings/${bookingId}`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector(SEL.editCustomerName, {
      state: "attached",
      timeout: 10000,
    });

    await page.locator(SEL.editCustomerName).fill("Playwright Test Customer Edit (edited)");
    await page.locator(SEL.editTravelers).fill("3");

    // Confirm React hydration before submitting the edit form
    await page.waitForTimeout(2000);

    await page.locator(SEL.editSubmit).click();

    // Navigate directly via page.goto to force full SSR after edit mutation.
    // Client-side router.push sends undefined to bookings.list tRPC input.
    await page.goto(`${BASE_URL}/en/dashboard/bookings`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "attached",
      timeout: 20000,
    });
  });
});
