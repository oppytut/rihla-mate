import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./scripts",
  testMatch: "*.spec.ts",
  globalSetup: "./scripts/playwright-global-setup.ts",
  globalSetupTimeout: 60_000,
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    storageState: ".playwright-storage.json",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: ["**/cloudflare-smoke.spec.ts", "**/rtl-arabic.spec.ts"],
    },
    {
      name: "smoke",
      use: { ...devices["Desktop Chrome"] },
      testMatch: "cloudflare-smoke.spec.ts",
    },
    {
      name: "rtl",
      use: { ...devices["Desktop Chrome"] },
      testMatch: "rtl-arabic.spec.ts",
    },
  ],
  webServer: {
    command: process.env.WEB_SERVER_COMMAND ?? "pnpm --filter @rihla-mate/app dev",
    port: 3000,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
