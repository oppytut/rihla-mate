import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

test.describe("product marketing surface", () => {
  test.use({ storageState: undefined });

  test("localhost home keeps SaaS pricing copy", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/`);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toMatch(/Harga|Pricing/);
    expect(html).toMatch(/Platform|white-label|Self-hosted/i);
  });
});
