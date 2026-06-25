import { test, expect, type BrowserContext } from "@playwright/test";

export const BASE_URL = "http://localhost:3000";

export const TEST_CREDENTIALS = {
  email: "playwright@rihlamate.test",
  password: "testpass123",
};

export async function signInAndGetCookie(
  request: Parameters<typeof test.beforeAll>[0]
): Promise<string> {
  const response = await request.post(`${BASE_URL}/api/auth/sign-in/email`, {
    data: TEST_CREDENTIALS,
  });

  expect(response.status()).toBe(200);

  const setCookieHeader = response.headers()["set-cookie"];
  expect(setCookieHeader).toBeTruthy();

  const match = setCookieHeader.match(/better-auth\.session_token=([^;]+)/);
  expect(match).not.toBeNull();
  expect(match![1]).toBeTruthy();

  return match![1];
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
