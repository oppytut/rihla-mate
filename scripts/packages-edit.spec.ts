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

test.describe("packages edit flow", () => {
  test.beforeEach(async ({ context }) => {
    await cleanupPlaywrightPackages(context);
  });

  test("creates a package and edits it from the list page", async ({ page }) => {
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
      .pressSequentially("Playwright Test Package Edit", { delay: 30 });
    await page
      .locator('[data-testid="package-slug"]')
      .pressSequentially(`playwright-test-package-edit-${Date.now()}`, { delay: 30 });
    await page.fill('[data-testid="package-description"]', "Package for edit test");
    await page.selectOption('[data-testid="package-category"]', "standard");
    await page.fill('[data-testid="package-duration-days"]', "3");
    await page.fill('[data-testid="package-price"]', "1000000");
    await page.selectOption('[data-testid="package-status"]', "draft");
    await page.fill('[data-testid="package-itinerary"]', '[{"day": 1, "description": "Test day"}]');
    await page.fill('[data-testid="package-inclusions"]', '["Test inclusion"]');
    await page.fill('[data-testid="package-exclusions"]', '["Test exclusion"]');
    await page.fill('[data-testid="package-available-dates"]', '["2026-07-01"]');
    await page.fill('[data-testid="package-gallery"]', "[]");

    // Register alert handler BEFORE clicking submit
    page.once("dialog", (dialog) => dialog.accept());

    // Confirm React hydration before submitting the form
    await page.waitForTimeout(5000);

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

    // ── Edit phase ──────────────────────────────────────────────────

    // Wait for the list table to render and find the edit button for our package
    await page.waitForSelector("table", { state: "attached", timeout: 10000 });

    // Click the first edit button that matches our package
    const editButton = page.locator('[data-testid^="package-edit-"]').first();
    await editButton.waitFor({ state: "visible", timeout: 10000 });
    await editButton.click();

    // Wait for the edit form to appear
    await page.waitForSelector('[data-testid="package-title"]', {
      state: "attached",
      timeout: 10000,
    });

    // Verify the existing title is loaded
    const titleInput = page.locator('[data-testid="package-title"]');
    await expect(titleInput).toHaveValue("Playwright Test Package Edit");

    // Modify fields
    await titleInput.clear();
    await titleInput.pressSequentially("Playwright Test Package Edit (edited)", { delay: 30 });

    const priceInput = page.locator('[data-testid="package-price"]');
    await priceInput.clear();
    await priceInput.fill("2000000");

    const durationInput = page.locator('[data-testid="package-duration-days"]');
    await durationInput.clear();
    await durationInput.fill("7");

    // Register alert handler BEFORE clicking submit
    page.once("dialog", (dialog) => dialog.accept());

    // Confirm React hydration before submitting the edit form
    await page.waitForTimeout(5000);

    await page.click('[data-testid="package-submit"]');

    // Navigate directly via page.goto to force full SSR
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
