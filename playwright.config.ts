import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./scripts",
  testMatch: "*.spec.ts",
  globalSetup: "./scripts/playwright-global-setup.ts",
  globalSetupTimeout: 60_000,
  timeout: 30_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm --filter @rihla-mate/app dev",
    port: 3000,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
