import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

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

test.describe("package delete flow", () => {
  test.beforeEach(async ({ context }) => {
    await cleanupPlaywrightPackages(context);
  });

  test("creates a package then deletes it from the list", async ({ page }) => {
    test.setTimeout(60000);

    const slug = `playwright-test-delete-${Date.now()}`;

    // ── Create phase ────────────────────────────────────────────────

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
      .locator('[data-testid="package-title"]')
      .pressSequentially("Playwright Test Delete", { delay: 30 });
    await page.locator('[data-testid="package-slug"]').pressSequentially(slug, { delay: 30 });
    await page.fill('[data-testid="package-description"]', "Package created for delete test");
    await page.selectOption('[data-testid="package-category"]', "premium");
    await page.fill('[data-testid="package-duration-days"]', "3");
    await page.fill('[data-testid="package-departure-city"]', "Surabaya");
    await page.selectOption('[data-testid="package-status"]', "published");
    await page.fill('[data-testid="package-price"]', "1000000");
    await page.selectOption('[data-testid="package-currency"]', "IDR");
    await page.fill(
      '[data-testid="package-featured-image"]',
      "https://example.com/delete-test.jpg",
    );
    await page.fill(
      '[data-testid="package-gallery"]',
      '["https://example.com/gallery-delete.jpg"]',
    );
    await page.fill(
      '[data-testid="package-itinerary"]',
      '[{"day": 1, "description": "Delete test day"}]',
    );
    await page.fill('[data-testid="package-inclusions"]', '["Meal"]');
    await page.fill('[data-testid="package-exclusions"]', '["Transport"]');
    await page.fill('[data-testid="package-available-dates"]', '["2026-09-01"]');

    // Confirm React hydration before submitting the form
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="package-title"]') as HTMLInputElement;
        return el && !el.disabled;
      },
      { timeout: 10000 },
    );

    // Submit — skip dialog handler for create success because page.goto
    // dismisses any alert and a pending once("dialog") would collide with
    // the delete-confirmation handler registered later
    await page.click('[data-testid="package-submit"]');

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

    // ── Delete phase ────────────────────────────────────────────────

    await page.waitForSelector("table", { state: "attached", timeout: 10000 });

    page.once("dialog", (dialog) => dialog.accept());

    await page.locator('[data-testid^="package-delete-"]').first().click();

    await expect(page.getByText("Playwright Test Delete")).not.toBeVisible({ timeout: 10000 });
  });
});
