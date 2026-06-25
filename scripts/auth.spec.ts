import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

test.describe("unauthorized access", () => {
  test("redirects to sign-in when accessing bookings without auth", async ({
    page,
  }) => {
    const response = await page.goto(
      `${BASE_URL}/en/dashboard/bookings`,
      { waitUntil: "domcontentloaded" }
    );

    // Either we get a redirect to sign-in or a 401/403
    const isRedirected =
      page.url().includes("/sign-in") ||
      page.url().includes("/login") ||
      page.url().includes("/auth");
    const isDenied =
      response !== null &&
      (response.status() === 401 || response.status() === 403);

    expect(isRedirected || isDenied).toBe(true);
  });
});
