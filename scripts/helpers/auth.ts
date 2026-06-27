import { test, expect, type BrowserContext } from "@playwright/test";

export const BASE_URL = "http://localhost:3000";

export const TEST_CREDENTIALS = {
  email: "playwright@rihlamate.test",
  password: "testpass123",
};

export async function signInAndGetCookie(
  request: Parameters<typeof test.beforeAll>[0]
): Promise<string> {
  // Retry up to 3 times with 1s delay — the seed script may not have
  // finished committing the user/account before the first test runs.
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await request.post(`${BASE_URL}/api/auth/sign-in/email`, {
      data: TEST_CREDENTIALS,
    });

    if (response.status() === 200) {
      const setCookieHeader = response.headers()["set-cookie"];
      expect(setCookieHeader).toBeTruthy();

      const match = setCookieHeader.match(/better-auth\.session_token=([^;]+)/);
      expect(match).not.toBeNull();
      expect(match![1]).toBeTruthy();

      return match![1];
    }

    // Log the error body for debugging, then retry
    const body = await response.text().catch(() => "<no body>");
    console.warn(
      `[auth] sign-in attempt ${attempt} returned ${response.status()}: ${body.slice(0, 200)}`
    );

    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  throw new Error("Failed to sign in after 3 attempts");
}

export async function setSessionCookie(context: BrowserContext, token: string) {
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax" as const,
    },
  ]);
}
