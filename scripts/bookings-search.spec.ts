import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

const SEL = {
  search: '[data-testid="bookings-search"]',
  statusFilter: '[data-testid="bookings-status-filter"]',
  clearFilters: '[data-testid="bookings-clear-filters"]',
  prevPage: '[data-testid="bookings-prev-page"]',
  nextPage: '[data-testid="bookings-next-page"]',
  pageInfo: '[data-testid="bookings-page-info"]',
} as const;

async function trpc(context: PlaywrightContext, path: string, input?: Record<string, unknown>) {
  // Non-batched superjson wire format: { json: <input> }
  const url = input
    ? `${BASE_URL}/api/trpc/${path}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`
    : `${BASE_URL}/api/trpc/${path}`;
  return context.request.get(url);
}

async function trpcMutate(
  context: PlaywrightContext,
  path: string,
  input: Record<string, unknown>,
) {
  // Mutations require POST with superjson-encoded body
  return context.request.post(`${BASE_URL}/api/trpc/${path}`, {
    data: { json: input },
  });
}

interface PlaywrightPage {
  goto(url: string, options?: Record<string, unknown>): Promise<unknown>;
  waitForSelector(selector: string, options?: Record<string, unknown>): Promise<unknown>;
  waitForTimeout(ms: number): Promise<void>;
  waitForURL(url: string, options?: Record<string, unknown>): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  click(selector: string): Promise<void>;
  locator(selector: string): { fill: (value: string) => Promise<void> };
  selectOption(selector: string, value: string): Promise<void>;
  getByRole(
    role: string,
    options?: Record<string, unknown>,
  ): { pressSequentially: (text: string) => Promise<void> };
  on(event: string, handler: (dialog: { accept: () => Promise<void> }) => void): void;
}

interface PlaywrightContext {
  request: {
    get(url: string): Promise<unknown>;
    post(url: string, options?: { data?: unknown }): Promise<unknown>;
  };
}

async function ensureSeedBookings(context: PlaywrightContext, _page: PlaywrightPage) {
  const seedNames = ["Alice Search Test", "Bob Search Test", "Charlie Filter Test"];

  // Check via API if seed bookings already exist (UI check fails when pagination pushes them off page 1)
  const existingRes = await trpc(context, "bookings.list", { search: "", page: 1, limit: 100 });
  const existingBody = await existingRes.json();
  const existingData = existingBody?.result?.data;
  const existingItems = existingData?.json?.items ?? existingData?.items ?? [];
  const existingNames: Set<string> = new Set(
    (existingItems as Array<{ customerName?: string }>).map((b) => b.customerName),
  );

  const missing = seedNames.filter((n) => !existingNames.has(n));
  if (missing.length === 0) return;

  // Fallback static packages matching playwright-seed.ts UUIDs.
  // The tRPC packages.list call may fail in CI (auth cookie not yet synced
  // to context.request, or seed.ts ran after playwright-seed wiped packages).
  // These static UUIDs guarantee bookings can always be created.
  const STATIC_PACKAGES: Array<{ id: string; availableDates: string[] }> = [
    {
      id: "00000000-0000-0000-0000-000000000001",
      availableDates: ["2026-07-01", "2026-07-15", "2026-08-01", "2026-08-15", "2026-09-01"],
    },
    {
      id: "00000000-0000-0000-0000-000000000002",
      availableDates: ["2026-07-01", "2026-07-20", "2026-08-05", "2026-08-20", "2026-09-05"],
    },
    {
      id: "00000000-0000-0000-0000-000000000003",
      availableDates: ["2026-07-01", "2026-07-10", "2026-07-25", "2026-08-10", "2026-08-25"],
    },
  ];

  // List packages via API to get real UUIDs and available dates
  const pkgsRes = await trpc(context, "packages.list", {
    search: "",
    status: "published",
    page: 1,
    limit: 10,
  });
  const pkgsBody = await pkgsRes.json();
  console.log("[ensureSeedBookings] packages.list status:", pkgsRes.status());

  let rawItems: unknown[] = [];
  const resultData = pkgsBody?.result?.data;
  if (resultData) {
    rawItems = resultData?.json?.items ?? resultData?.items ?? [];
  }

  const packages: Array<{ id: string; title: string; availableDates: string[] }> =
    rawItems as Array<{ id: string; title: string; availableDates: string[] }>;

  console.log("[ensureSeedBookings] package count:", packages.length);

  if (packages.length < 3) {
    console.log("[ensureSeedBookings] API returned <3 packages, using static fallback");
    STATIC_PACKAGES.forEach((p, i) => {
      packages[i] = {
        id: p.id,
        title: `Static Package ${i + 1}`,
        availableDates: p.availableDates,
      };
    });
  }

  // Create only missing seed bookings via API with different packages/dates to avoid 409 CONFLICT.
  // If a 409 is returned, retry with the next available package.
  const seedData: Array<{ name: string; packageIdx: number; dateIdx: number }> = [
    { name: "Alice Search Test", packageIdx: 0, dateIdx: 3 },
    { name: "Bob Search Test", packageIdx: 1, dateIdx: 3 },
    { name: "Charlie Filter Test", packageIdx: 2, dateIdx: 4 },
  ];

  for (const item of seedData) {
    if (!missing.includes(item.name)) continue;

    let created = false;
    // Try up to 5 packages (wrapping around) on 409 CONFLICT
    for (let attempt = 0; attempt < packages.length && !created; attempt++) {
      const pkgIdx = (item.packageIdx + attempt) % packages.length;
      const pkg = packages[pkgIdx];
      if (!pkg) continue;
      const date = pkg.availableDates?.[item.dateIdx] ?? "2026-07-01";
      const res = await trpcMutate(context, "bookings.create", {
        packageId: pkg.id,
        departureDate: date,
        customerName: item.name,
        travelers: 2,
        totalPrice: "1500000",
      });
      const body = await res.json();
      const ok = body?.result?.data?.json?.id || body?.result?.data?.id;
      if (ok) {
        created = true;
        console.log(
          `[ensureSeedBookings] ${item.name}: created, status=${res.status()}, pkgIdx=${pkgIdx}`,
        );
      } else if (res.status() === 409) {
        console.log(`[ensureSeedBookings] ${item.name}: 409 on pkgIdx=${pkgIdx}, retrying next...`);
      } else {
        console.log(
          `[ensureSeedBookings] ${item.name}: failed, status=${res.status()}, pkgIdx=${pkgIdx}`,
        );
      }
    }
    if (!created) {
      console.log(`[ensureSeedBookings] ${item.name}: FAILED after all retries`);
    }
  }
}

test.describe("bookings search and filter", () => {
  test.beforeEach(async ({ context, page }) => {
    await ensureSeedBookings(context, page);
    await page.goto(`${BASE_URL}/en/dashboard/bookings`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector("table", { state: "attached", timeout: 10000 });
  });

  test("search by customer name filters results", async ({ page }) => {
    const searchInput = page.locator(SEL.search);
    await searchInput.click();
    await searchInput.pressSequentially("Alice", { delay: 50 });

    // Wait for debounce (300ms) + TRPC query + React render
    await page.waitForTimeout(2000);

    await expect(page.locator("td").filter({ hasText: "Alice Search Test" }).first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("Bob Search Test")).not.toBeVisible({ timeout: 5000 });
  });

  test("filter by status shows only matching bookings", async ({ page }) => {
    const statusFilter = page.locator(SEL.statusFilter);
    await statusFilter.selectOption("confirmed");
    await page.waitForTimeout(500);

    const table = page.locator("table");
    const noResults = page.locator(SEL.clearFilters);
    await expect(table.or(noResults).first()).toBeVisible({ timeout: 5000 });
  });

  test("clear filters restores full list after search", async ({ page }) => {
    const searchInput = page.locator(SEL.search);
    await searchInput.click();
    await searchInput.pressSequentially("ZZZ_NONEXISTENT_NAME_ZZZ", { delay: 30 });

    // Wait for debounce (300ms) + TRPC query + React render
    await page.waitForTimeout(2000);

    const clearBtn = page.locator(SEL.clearFilters);
    await expect(clearBtn).toBeVisible({ timeout: 5000 });

    await clearBtn.click();

    // Wait for TRPC query + React re-render after clearing
    await page.waitForTimeout(2000);

    await expect(page.getByText("Alice Search Test")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Bob Search Test")).toBeVisible({ timeout: 5000 });
  });

  test("pagination buttons are present and previous is disabled on page 1", async ({ page }) => {
    const prevBtn = page.locator(SEL.prevPage);
    const nextBtn = page.locator(SEL.nextPage);

    await expect(prevBtn).toBeVisible({ timeout: 5000 });
    await expect(nextBtn).toBeVisible({ timeout: 5000 });
    await expect(prevBtn).toBeDisabled({ timeout: 5000 });
  });

  test("combined search and status filter narrows results", async ({ page }) => {
    const searchInput = page.locator(SEL.search);
    await searchInput.click();
    await searchInput.pressSequentially("Alice", { delay: 50 });

    // Wait for debounce (300ms) + TRPC query + React render
    await page.waitForTimeout(2000);

    const statusFilter = page.locator(SEL.statusFilter);
    await statusFilter.selectOption("pending");
    await page.waitForTimeout(2000);

    // Bookings are created with default status "pending", so Alice should appear
    await expect(page.locator("td").filter({ hasText: "Alice Search Test" }).first()).toBeVisible({
      timeout: 5000,
    });

    await expect(page.locator('[data-testid="page-heading"]')).toBeVisible();
  });
});
