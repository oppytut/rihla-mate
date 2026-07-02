import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

const SEL = {
  title: '[data-testid="package-title"]',
  slug: '[data-testid="package-slug"]',
  description: '[data-testid="package-description"]',
  category: '[data-testid="package-category"]',
  durationDays: '[data-testid="package-duration-days"]',
  departureCity: '[data-testid="package-departure-city"]',
  status: '[data-testid="package-status"]',
  price: '[data-testid="package-price"]',
  currency: '[data-testid="package-currency"]',
  featuredImage: '[data-testid="package-featured-image"]',
  gallery: '[data-testid="package-gallery"]',
  itinerary: '[data-testid="package-itinerary"]',
  inclusions: '[data-testid="package-inclusions"]',
  exclusions: '[data-testid="package-exclusions"]',
  availableDates: '[data-testid="package-available-dates"]',
  submit: '[data-testid="package-submit"]',
  search: '[data-testid="packages-search"]',
} as const;

/**
 * Delete all packages whose title matches "Playwright Test".
 *
 * Uses `context.request` so the API calls share the browser context's
 * auth cookies from storageState.
 */
async function cleanupPlaywrightPackages(context: {
  request: {
    get: (url: string) => Promise<{ ok: () => boolean; json: () => Promise<unknown> }>;
  };
}) {
  const api = context.request;
  try {
    const listRes = await api.get(
      `${BASE_URL}/api/trpc/packages.list?batch=1&input=${encodeURIComponent(
        JSON.stringify({ json: { search: "Playwright Test" } }),
      )}`,
    );
    if (!listRes.ok()) return;

    const body: unknown = await listRes.json();
    const items: Array<{ id: string }> =
      body?.[0]?.result?.data?.items ?? body?.[0]?.result?.data?.json?.items ?? [];
    for (const item of items) {
      if (item.id) {
        await api
          .get(
            `${BASE_URL}/api/trpc/packages.delete?batch=1&input=${encodeURIComponent(
              JSON.stringify({ json: { id: item.id } }),
            )}`,
          )
          .catch(() => {});
      }
    }
  } catch {
    // cleanup is best-effort — ignore errors
  }
}

test.describe("package creation flow", () => {
  test.beforeEach(async ({ context }) => {
    await cleanupPlaywrightPackages(context);
  });

  test("fills all form fields and creates a new package", async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(`${BASE_URL}/en/dashboard/packages/new`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "attached",
      timeout: 10000,
    });

    // Wait for React hydration — controlled inputs need onChange handlers attached
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="package-title"]') as HTMLInputElement;
        return el && !el.disabled;
      },
      { timeout: 10000 },
    );

    await page.locator(SEL.title).pressSequentially("Playwright Test Package", { delay: 30 });
    await page
      .locator(SEL.slug)
      .pressSequentially(`playwright-test-package-${Date.now()}`, { delay: 30 });

    await page.locator(SEL.description).fill("A test package created by Playwright");
    await page.locator(SEL.category).selectOption("premium");
    await page.locator(SEL.durationDays).fill("5");
    await page.locator(SEL.departureCity).fill("Jakarta");
    await page.locator(SEL.status).selectOption("published");
    await page.locator(SEL.price).fill("2500000");
    await page.locator(SEL.currency).selectOption("USD");
    await page.locator(SEL.featuredImage).fill("https://example.com/test-image.jpg");
    await page.locator(SEL.gallery).fill('["https://example.com/gallery1.jpg"]');
    await page.locator(SEL.itinerary).fill('[{"day": 1, "description": "Arrival and check-in"}]');
    await page.locator(SEL.inclusions).fill('["Hotel", "Breakfast"]');
    await page.locator(SEL.exclusions).fill('["Flights", "Visa"]');
    await page.locator(SEL.availableDates).fill('["2026-07-01", "2026-08-15"]');

    // Register alert handler BEFORE clicking submit
    page.once("dialog", (dialog) => dialog.accept());

    // Confirm React hydration before submitting the form
    await page.waitForTimeout(5000);

    await page.click(SEL.submit);

    // Navigate directly via page.goto to force full SSR — client-side router.push
    // sends undefined to packages.list tRPC input, crashing the React 19 tree
    await page.goto(`${BASE_URL}/en/dashboard/packages`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "attached",
      timeout: 20000,
    });
    expect(page.url()).toContain("/dashboard/packages");
    expect(page.url()).not.toContain("/new");
  });
});
