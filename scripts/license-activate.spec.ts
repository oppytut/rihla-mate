import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

const SEL = {
  heading: "h1",
  licenseKeyInput: '[data-testid="activate-license-key"]',
  submitButton: '[data-testid="activate-submit"]',
  startTrialButton: '[data-testid="activate-start-trial"]',
} as const;

test.describe("license activation page", () => {
  test("renders license activation page with key elements", async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(`${BASE_URL}/en/activate`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector(SEL.heading, {
      state: "visible",
      timeout: 10000,
    });

    await expect(page.locator(SEL.heading)).toHaveText("Activate License");

    await page.waitForSelector(SEL.licenseKeyInput, {
      state: "visible",
      timeout: 10000,
    });

    await page.waitForSelector(SEL.submitButton, {
      state: "visible",
      timeout: 10000,
    });

    await page.waitForSelector(SEL.startTrialButton, {
      state: "visible",
      timeout: 10000,
    });

    await expect(page.locator(SEL.licenseKeyInput)).toBeVisible();
    await expect(page.locator(SEL.submitButton)).toBeVisible();
    await expect(page.locator(SEL.startTrialButton)).toBeVisible();
  });

  test("activate button is disabled when license key input is empty", async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(`${BASE_URL}/en/activate`, {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector(SEL.submitButton, {
      state: "visible",
      timeout: 10000,
    });

    await expect(page.locator(SEL.submitButton)).toBeDisabled();
  });
});
