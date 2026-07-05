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
  editButton: '[data-testid^="booking-edit-"]',
  deleteButton: '[data-testid^="booking-delete-"]',
} as const;

/**
 * Delete all bookings whose customerName matches "Playwright Test Lifecycle".
 *
 * Uses `context.request` so the API calls share the browser context's
 * auth cookies from storageState (the global request fixture does NOT).
 */
async function cleanupPlaywrightLifecycleBookings(context: {
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
      data: { json: { search: "Playwright Test Lifecycle" } },
    });
    if (!listRes.ok()) return;

    const body = (await listRes.json()) as {
      result?: {
        data?: { json?: { items?: Array<{ id: string }> } };
      };
    };
    const items: Array<{ id: string }> = body?.result?.data?.json?.items ?? [];
    for (const item of items) {
      if (item.id) {
        await api.post(`${BASE_URL}/api/trpc/bookings.delete`, { data: { json: { id: item.id } } });
      }
    }
  } catch {
    // Cleanup failures are non-critical — ignore and continue
  }
}

test.describe("booking lifecycle", () => {
  test.beforeEach(async ({ context }) => {
    await cleanupPlaywrightLifecycleBookings(context);
  });

  test("create, edit, and delete a booking in a single flow", async ({ page }) => {
    test.setTimeout(90000);

    // ── CREATE PHASE ───────────────────────────────────────────────────
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
    await customerNameInput.pressSequentially("Playwright Test Lifecycle", { delay: 30 });

    // Wait for package options to be available
    await page
      .locator('#packageId option[value]:not([value=""])')
      .first()
      .waitFor({ state: "attached", timeout: 15000 });
    await page.waitForTimeout(500);

    // Resolve the option value for "Komodo Island Expedition" by its text content.
    // Using selectOption({ label }) can race with React re-renders (controlled component
    // resets value="") and Playwright's label matching is fragile. Instead, find the
    // option by text, extract its value, and selectOption by value.
    const komodoOptionValue = await page
      .locator("#packageId option")
      .filter({ hasText: "Komodo Island Expedition" })
      .getAttribute("value");
    if (!komodoOptionValue) throw new Error("Komodo Island Expedition option not found");
    await page.locator(SEL.packageId).selectOption(komodoOptionValue);

    // Wait for React to commit the state update — the controlled <select> value should match.
    await expect(page.locator(SEL.packageId)).toHaveValue(komodoOptionValue, { timeout: 5000 });

    // Open date picker and navigate to August 20, 2026
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
    await page.locator(SEL.calendarDay("8/20/2026")).first().click();

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

    // Wait for redirect to the list page after successful create
    await page.waitForURL(
      (url) => url.href.includes("/dashboard/bookings") && !url.href.includes("/new"),
      { timeout: 15000 },
    );

    // ── DIAGNOSTIC: capture what renders on the bookings list page ────
    // Collect console errors and network responses for debugging
    const consoleErrors: string[] = [];
    const trpcResponses: Array<{ url: string; status: number; body: string }> = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("response", async (response) => {
      if (response.url().includes("/api/trpc/")) {
        try {
          const body = await response.text();
          trpcResponses.push({ url: response.url(), status: response.status(), body });
        } catch {
          // ignore
        }
      }
    });

    // Give time for client-side hydration + tRPC query to resolve
    await page.waitForTimeout(3000);

    // Screenshot + page content for diagnostics
    await page.screenshot({
      path: "test-results/booking-lifecycle-after-redirect.png",
      fullPage: true,
    });
    const pageContent = await page.content();
    console.log("[DIAGNOSTIC] Page title:", await page.title());
    console.log("[DIAGNOSTIC] URL:", page.url());
    console.log("[DIAGNOSTIC] Table exists:", pageContent.includes("<table"));
    console.log(
      "[DIAGNOSTIC] Empty state testid:",
      pageContent.includes('data-testid="bookings-add-new-empty"'),
    );
    console.log(
      "[DIAGNOSTIC] Error state:",
      pageContent.includes("bookingsQuery.isError") ||
        pageContent.includes("Failed to load bookings"),
    );
    console.log("[DIAGNOSTIC] Loading skeleton:", pageContent.includes("animate-pulse"));
    console.log("[DIAGNOSTIC] Console errors:", JSON.stringify(consoleErrors));
    console.log("[DIAGNOSTIC] tRPC responses:", JSON.stringify(trpcResponses.slice(-5)));
    console.log("[DIAGNOSTIC] Page HTML (first 3000 chars):", pageContent.substring(0, 3000));

    // ── EDIT PHASE ─────────────────────────────────────────────────────
    await page.waitForSelector("table", { state: "visible", timeout: 10000 });
    // Wait for at least one table row to appear and stabilize before clicking.
    // The table re-renders as React hydrates with tRPC data, causing "element is not stable".
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.waitFor({ state: "visible", timeout: 10000 });
    await firstRow.waitFor({ state: "attached", timeout: 5000 });
    // Extra settle time for any CSS transitions / layout shifts
    await page.waitForTimeout(500);

    const firstEditButton = page.locator(SEL.editButton).first();
    await firstEditButton.waitFor({ state: "visible", timeout: 10000 });

    // Extract booking ID and navigate via page.goto for full SSR.
    // Client-side router.push sends undefined to bookings.list tRPC input,
    // crashing the React 19 tree.
    const editBtnTestId = await firstEditButton.getAttribute("data-testid");
    if (!editBtnTestId) throw new Error("edit button missing data-testid");
    const bookingId = editBtnTestId.replace("booking-edit-", "");
    await page.goto(`${BASE_URL}/en/dashboard/bookings/${bookingId}`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector(SEL.customerName, {
      state: "attached",
      timeout: 10000,
    });

    await page.locator(SEL.customerName).fill("Playwright Test Lifecycle (edited)");
    await page.locator(SEL.travelers).fill("3");

    // Confirm React hydration before submitting the edit form
    await page.waitForTimeout(2000);

    await page.locator(SEL.submitButton).click();

    // Navigate directly via page.goto to force full SSR after mutation.
    // Client-side router.push sends undefined to bookings.list tRPC input.
    await page.goto(`${BASE_URL}/en/dashboard/bookings`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "attached",
      timeout: 20000,
    });

    // ── DELETE PHASE ───────────────────────────────────────────────────
    await page.waitForSelector("table", { state: "visible", timeout: 10000 });

    // Handle window.confirm dialog
    page.once("dialog", (dialog) => dialog.accept());

    // Click the first delete button
    await page.locator(SEL.deleteButton).first().click();

    // Handle window.alert success dialog
    page.once("dialog", (dialog) => dialog.accept());

    // Verify the booking is no longer visible
    await expect(page.getByText("Playwright Test Lifecycle")).not.toBeVisible({ timeout: 10000 });
  });
});
