import type { FullConfig } from "@playwright/test";
import { chromium } from "@playwright/test";
import { readFileSync, unlinkSync } from "fs";
import { main as runSeed } from "./playwright-seed";

async function globalSetup(config: FullConfig) {
  console.log("[global-setup] Running seed script...");
  await runSeed();

  const authData = JSON.parse(readFileSync(".playwright-auth.json", "utf-8"));
  const { email, password } = authData as {
    sessionToken: string;
    email: string;
    password: string;
  };

  const browser = await chromium.launch();
  const context = await browser.newContext();

  // Sign in via Better Auth's API endpoint to get a signed session cookie.
  // The seed creates the user + account in the DB, but Better Auth signs
  // cookies with a JWT — the raw session token from the seed won't work.
  // POST /api/auth/sign-in/email returns a Set-Cookie header with the
  // properly signed cookie that the server will accept.
  const request = context.request;
  const signInResponse = await request.post(
    "http://localhost:3000/api/auth/sign-in/email",
    { data: { email, password } },
  );

  if (signInResponse.status() !== 200) {
    const body = await signInResponse.text();
    throw new Error(
      `[global-setup] Sign-in failed with status ${signInResponse.status()}: ${body}`,
    );
  }

  const setCookieHeader = signInResponse.headers()["set-cookie"];
  if (!setCookieHeader) {
    throw new Error(
      "[global-setup] No set-cookie header in sign-in response",
    );
  }

  const match = setCookieHeader.match(/better-auth\.session_token=([^;]+)/);
  if (!match?.[1]) {
    throw new Error(
      "[global-setup] Could not extract better-auth.session_token from set-cookie",
    );
  }

  const signedToken = match[1];
  console.log("[global-setup] Got signed session token from API");

  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: signedToken,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax" as const,
    },
  ]);

  const page = await context.newPage();
  await page.goto("http://localhost:3000/en/dashboard", {
    waitUntil: "domcontentloaded",
  });

  await page.waitForLoadState("networkidle");
  const currentUrl = page.url();
  if (currentUrl.includes("/sign-in")) {
    throw new Error(
      `[global-setup] Redirected to sign-in — auth cookie rejected. URL: ${currentUrl}`
    );
  }
  console.log("[global-setup] Authenticated page load confirmed");

  await context.storageState({ path: ".playwright-storage.json" });
  await browser.close();

  try {
    unlinkSync(".playwright-auth.json");
  } catch {
    // ignore
  }

  console.log("[global-setup] storageState saved to .playwright-storage.json");
}

export default globalSetup;
