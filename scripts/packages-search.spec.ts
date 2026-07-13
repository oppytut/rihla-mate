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
  statusFilter: '[data-testid="packages-status-filter"]',
  clearFilters: '[data-testid="packages-clear-filters"]',
  prevPage: '[data-testid="packages-prev-page"]',
  nextPage: '[data-testid="packages-next-page"]',
  pageInfo: '[data-testid="packages-page-info"]',
} as const;

interface PackagesPage {
  goto(url: string, options?: Record<string, unknown>): Promise<unknown>;
  waitForSelector(selector: string, options?: Record<string, unknown>): Promise<unknown>;
  waitForFunction(fn: () => boolean, options?: Record<string, unknown>): Promise<unknown>;
  waitForTimeout(ms: number): Promise<void>;
  waitForURL(url: string, options?: Record<string, unknown>): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  click(selector: string): Promise<void>;
  locator(selector: string): {
    pressSequentially: (text: string, options?: Record<string, unknown>) => Promise<void>;
  };
  selectOption(selector: string, value: string): Promise<void>;
  on(event: string, handler: (dialog: { accept: () => Promise<void> }) => void): void;
}

interface PackagesContext {
  request: {
    get(url: string): Promise<{ ok: () => boolean; json: () => Promise<unknown> }>;
    post(url: string, options?: { data?: Record<string, unknown> }): Promise<void>;
  };
}

async function createPackageViaForm(
  page: PackagesPage,
  title: string,
  slug: string,
  statusValue: string,
) {
  await page.goto(`${BASE_URL}/en/dashboard/packages/new`, {
    waitUntil: "domcontentloaded",
  });

  await page.waitForSelector('[data-testid="page-heading"]', { state: "attached", timeout: 10000 });

  // Wait for React hydration — controlled inputs need onChange handlers attached
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="package-title"]') as HTMLInputElement;
      return el && !el.disabled;
    },
    { timeout: 10000 },
  );

  await page.locator(SEL.title).fill(title);
  await page.locator(SEL.slug).fill(slug);
  await page.locator(SEL.description).fill("Search test package");
  await page.selectOption(SEL.category, "premium");
  await page.locator(SEL.durationDays).fill("3");
  await page.locator(SEL.departureCity).fill("Jakarta");
  await page.selectOption(SEL.status, statusValue);
  await page.locator(SEL.price).fill("2000000");
  await page.selectOption(SEL.currency, "IDR");
  await page.locator(SEL.featuredImage).fill("https://example.com/search-test.jpg");
  await page.locator(SEL.gallery).fill('["https://example.com/gallery-search.jpg"]');
  await page.locator(SEL.itinerary).fill('[{"day": 1, "description": "Search test day"}]');
  await page.locator(SEL.inclusions).fill('["Breakfast"]');
  await page.locator(SEL.exclusions).fill('["Flights"]');
  await page.locator(SEL.availableDates).fill('["2026-07-01"]');

  page.once("dialog", (dialog) => dialog.accept());

  // Confirm React hydration before submitting the form
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="package-title"]') as HTMLInputElement;
      return el && !el.disabled;
    },
    { timeout: 10000 },
  );

  await page.click(SEL.submit);

  // Navigate directly via page.goto to force full SSR — client-side router.push
  // sends undefined to packages.list tRPC input, crashing the React 19 tree
  await page.goto(`${BASE_URL}/en/dashboard/packages`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector('[data-testid="page-heading"]', { state: "attached", timeout: 20000 });
}

async function cleanupSearchPackages(context: PackagesContext) {
  const api = context.request;
  try {
    const listRes = await api.get(
      `${BASE_URL}/api/trpc/packages.list?batch=1&input=${encodeURIComponent(
        JSON.stringify({ json: { search: "Search Pkg" } }),
      )}`,
    );
    if (!listRes.ok()) return;
    const body: unknown = await listRes.json();
    const items: Array<{ id: string }> = body?.[0]?.result?.data?.json?.items ?? [];
    for (const item of items) {
      if (item.id) {
        await api
          .post(`${BASE_URL}/api/trpc/packages.delete`, {
            data: { json: { id: item.id } },
          })
          .catch(() => {});
      }
    }
  } catch {
    // cleanup is best-effort
  }
}

async function ensureSeedPackages(page: PackagesPage, context: PackagesContext) {
  // Check if seed packages already exist (idempotency guard)
  const api = context.request;
  const existingRes = await api.get(
    `${BASE_URL}/api/trpc/packages.list?batch=1&input=${encodeURIComponent(
      JSON.stringify({ json: { search: "Search Pkg" } }),
    )}`,
  );
  if (existingRes.ok()) {
    const existingBody: unknown = await existingRes.json();
    const existingItems: Array<{ title: string }> =
      existingBody?.[0]?.result?.data?.json?.items ?? [];
    const existingTitles = new Set(existingItems.map((i) => i.title));
    const needed = [
      { title: "Alpha Search Pkg" },
      { title: "Beta Search Pkg" },
      { title: "Gamma Filter Pkg" },
    ];
    const allExist = needed.every((n) => existingTitles.has(n.title));
    if (allExist) {
      // Seed packages already present — navigate to list page and return
      await page.goto(`${BASE_URL}/en/dashboard/packages`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForSelector('[data-testid="page-heading"]', {
        state: "attached",
        timeout: 10000,
      });
      return;
    }
  }

  // Always delete existing seed packages first to avoid duplicates
  await cleanupSearchPackages(context);

  await page.goto(`${BASE_URL}/en/dashboard/packages`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector('[data-testid="page-heading"]', { state: "attached", timeout: 10000 });

  // Wait for the initial packages.list query to render (skeleton → table)
  await page.waitForFunction(() => !document.querySelector(".animate-pulse"), { timeout: 15000 });

  const seedData = [
    { title: "Alpha Search Pkg", slug: `alpha-search-pkg-${Date.now()}`, status: "draft" },
    { title: "Beta Search Pkg", slug: `beta-search-pkg-${Date.now()}`, status: "published" },
    { title: "Gamma Filter Pkg", slug: `gamma-filter-pkg-${Date.now()}`, status: "archived" },
  ];

  for (const item of seedData) {
    await createPackageViaForm(page, item.title, item.slug, item.status);
  }
}

test.describe("packages search and filter", () => {
  test.beforeEach(async ({ page, context }) => {
    await cleanupSearchPackages(context);
    await ensureSeedPackages(page, context);
  });

  test("search by title filters results", async ({ page }) => {
    const searchInput = page.locator(SEL.search);
    await searchInput.fill("Alpha");

    // Wait for debounced search: Beta should disappear when searching "Alpha"
    await expect(page.getByText("Beta Search Pkg").first()).not.toBeVisible({
      timeout: 15000,
    });

    await expect(page.getByText("Alpha Search Pkg").first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("filter by status shows only matching packages", async ({ page }) => {
    const statusFilter = page.locator(SEL.statusFilter);
    await statusFilter.selectOption("published");

    // Wait for filtered results: Alpha (draft) should disappear
    await expect(page.getByText("Alpha Search Pkg").first()).not.toBeVisible({
      timeout: 15000,
    });

    await expect(page.getByText("Beta Search Pkg").first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("clear filters restores full list after search", async ({ page }) => {
    const searchInput = page.locator(SEL.search);
    await searchInput.fill("ZZZ_NONEXISTENT_PACKAGE_ZZZ");

    const clearBtn = page.locator(SEL.clearFilters);
    await expect(clearBtn).toBeVisible({ timeout: 15000 });

    await clearBtn.click();

    await expect(page.getByText("Alpha Search Pkg").first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Beta Search Pkg").first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("pagination buttons are present and previous is disabled on page 1", async ({ page }) => {
    const prevBtn = page.locator(SEL.prevPage);
    const nextBtn = page.locator(SEL.nextPage);

    await expect(prevBtn).toBeVisible({ timeout: 15000 });
    await expect(nextBtn).toBeVisible({ timeout: 5000 });
    await expect(prevBtn).toBeDisabled({ timeout: 5000 });
  });

  test("combined search and status filter narrows results", async ({ page }) => {
    const searchInput = page.locator(SEL.search);
    await searchInput.fill("Beta");

    // Wait for debounced search: Alpha should disappear when searching "Beta"
    await expect(page.getByText("Alpha Search Pkg").first()).not.toBeVisible({
      timeout: 15000,
    });

    await expect(page.getByText("Beta Search Pkg").first()).toBeVisible({
      timeout: 5000,
    });

    const statusFilter = page.locator(SEL.statusFilter);
    await statusFilter.selectOption("published");

    // Wait for filtered results: Alpha (draft) should disappear
    await expect(page.getByText("Alpha Search Pkg").first()).not.toBeVisible({
      timeout: 15000,
    });

    await expect(page.getByText("Beta Search Pkg").first()).toBeVisible({
      timeout: 5000,
    });
  });
});
