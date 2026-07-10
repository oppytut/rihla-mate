import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

async function cleanupPlaywrightPackages(context: {
  request: {
    get: (url: string) => Promise<{ ok: () => boolean; json: () => Promise<unknown> }>;
    post: (url: string, options?: { data?: Record<string, unknown> }) => Promise<void>;
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

    // Confirm React hydration before submitting the form — the submit button
    // should be visible and not disabled
    const submitBtn = page.locator('[data-testid="package-submit"]');
    await expect(submitBtn).toBeVisible({ timeout: 15000 });
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });

    await submitBtn.click();

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

    await page.waitForSelector("table", { state: "attached", timeout: 10000 });

    const editButton = page.locator('[data-testid^="package-edit-"]').first();
    await editButton.waitFor({ state: "visible", timeout: 10000 });

    // Extract the package ID from data-testid and navigate directly.
    // Clicking the <Link> triggers client-side router.push which can
    // fail to hydrate the edit form (same route, different [id] param).
    const editBtnTestId = await editButton.getAttribute("data-testid");
    if (!editBtnTestId) throw new Error("edit button missing data-testid");
    const packageId = editBtnTestId.replace("package-edit-", "");
    await page.goto(`${BASE_URL}/en/dashboard/packages/${packageId}`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('[data-testid="package-title"]', {
      state: "attached",
      timeout: 10000,
    });

    // Wait for the input to be visible and hydrated before checking value
    const titleInput = page.locator('[data-testid="package-title"]');
    await expect(titleInput).toBeVisible({ timeout: 10000 });

    // Verify the existing title is loaded
    await expect(titleInput).toHaveValue("Playwright Test Package Edit", { timeout: 15000 });

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
    const editSubmitBtn = page.locator('[data-testid="package-submit"]');
    await expect(editSubmitBtn).toBeVisible({ timeout: 15000 });
    await expect(editSubmitBtn).toBeEnabled({ timeout: 5000 });

    await editSubmitBtn.click();

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
