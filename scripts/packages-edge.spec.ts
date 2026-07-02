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
  validationError: '[data-testid^="validation-error-"]',
} as const;

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
    // cleanup is best-effort
  }
}

test.describe("package edge cases", () => {
  test("shows validation errors when submitting empty form", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/packages/new`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "attached",
      timeout: 10000,
    });
    await page.waitForSelector(SEL.submit, {
      state: "attached",
      timeout: 10000,
    });

    // Wait for React hydration before interacting with the form
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="package-title"]') as HTMLInputElement;
        return el && !el.disabled;
      },
      { timeout: 10000 },
    );

    // Click submit button to trigger React form validation
    await page.locator(SEL.submit).click();

    await page.waitForSelector(SEL.validationError, {
      state: "attached",
      timeout: 10000,
    });

    const errorCount = await page.locator(SEL.validationError).count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test("shows error when creating package with duplicate slug", async ({ page, context }) => {
    const slug = `playwright-edge-duplicate-${Date.now()}`;

    await cleanupPlaywrightPackages(context);

    // First, create a package with a specific slug
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

    await page
      .locator(SEL.title)
      .pressSequentially(`Playwright Test Duplicate ${Date.now()}`, { delay: 30 });
    await page.locator(SEL.slug).pressSequentially(slug, { delay: 30 });
    await page.fill(SEL.description, "First package with this slug");
    await page.fill(SEL.durationDays, "3");
    await page.fill(SEL.price, "1000000");

    page.once("dialog", (dialog) => dialog.accept());

    // Confirm React hydration before submitting the form
    await page.waitForTimeout(5000);

    await page.locator(SEL.submit).click();

    // Navigate directly via page.goto to force full SSR — client-side router.push
    // sends undefined to packages.list tRPC input, crashing the React 19 tree
    await page.goto(`${BASE_URL}/en/dashboard/packages`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "attached",
      timeout: 20000,
    });

    // Now try to create another package with the same slug
    await page.goto(`${BASE_URL}/en/dashboard/packages/new`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "attached",
      timeout: 10000,
    });

    // Wait for React hydration
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="package-title"]') as HTMLInputElement;
        return el && !el.disabled;
      },
      { timeout: 10000 },
    );

    await page.fill(SEL.title, `Playwright Test Duplicate 2 ${Date.now()}`);
    await page.fill(SEL.slug, slug);
    await page.fill(SEL.description, "Second package with duplicate slug");
    await page.fill(SEL.durationDays, "5");
    await page.fill(SEL.price, "2000000");

    page.once("dialog", (dialog) => dialog.accept());
    await page.locator(SEL.submit).click();

    // Wait for either a validation error or the submitError container
    const submitErrorContainer = page.locator(".bg-destructive\\/10, [class*='destructive']");
    try {
      await submitErrorContainer.first().waitFor({
        state: "visible",
        timeout: 10000,
      });
      const errorVisible = await submitErrorContainer.first().isVisible();
      expect(errorVisible).toBe(true);
    } catch {
      // If no error container, check if we stayed on the form page
      const currentUrl = page.url();
      expect(currentUrl).toContain("/dashboard/packages/new");
    }
  });

  test("shows error for negative price", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/packages/new`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "attached",
      timeout: 10000,
    });
    await page.waitForSelector(SEL.price, {
      state: "attached",
      timeout: 10000,
    });

    // Wait for React hydration before interacting with the form
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="package-title"]') as HTMLInputElement;
        return el && !el.disabled;
      },
      { timeout: 10000 },
    );

    // Fill required fields
    await page.fill(SEL.title, "Playwright Test Negative Price");
    await page.fill(SEL.slug, `playwright-negative-price-${Date.now()}`);
    await page.fill(SEL.durationDays, "3");

    // Enter negative price
    await page.fill(SEL.price, "-500");

    // Click submit button to trigger React form validation
    await page.locator(SEL.submit).click();

    await page.waitForSelector(SEL.validationError, {
      state: "attached",
      timeout: 10000,
    });

    const errorCount = await page.locator(SEL.validationError).count();
    expect(errorCount).toBeGreaterThan(0);
  });

  test("shows errors for missing required fields when submitting partial form", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/en/dashboard/packages/new`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="page-heading"]', {
      state: "attached",
      timeout: 10000,
    });

    // Wait for React hydration before interacting with the form
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="package-title"]') as HTMLInputElement;
        return el && !el.disabled;
      },
      { timeout: 10000 },
    );

    // Fill only some fields - title auto-generates slug, but price is empty
    await page.fill(SEL.title, "Playwright Test Partial");
    // slug auto-generated from title, durationDays defaults to 1

    // Click submit button to trigger React form validation
    await page.locator(SEL.submit).click();

    await page.waitForSelector(SEL.validationError, {
      state: "attached",
      timeout: 10000,
    });

    const errorCount = await page.locator(SEL.validationError).count();
    // Should have at least 1 error: price is required
    expect(errorCount).toBeGreaterThanOrEqual(1);
  });
});
