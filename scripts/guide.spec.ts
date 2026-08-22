import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

test.describe("public guide", () => {
  test.use({ storageState: undefined });

  test("renders operational guide without error boundary", async ({ page }) => {
    await page.goto(`${BASE_URL}/guide`, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(
      /Ada yang tidak beres|Something went wrong/i,
    );
    await expect(page.locator("#server")).toBeVisible();
    await expect(page.locator("#who")).toBeVisible();
  });

  test("junk locale path does not 500", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/index.php`);
    expect(response.status()).toBeLessThan(500);
  });
});
