import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

const SELECTORS = {
  nextStep0: "installer-next-step-0",
  nextStep1: "installer-next-step-1",
  nextStep3: "installer-next-step-3",
  back: "installer-back",
  adminName: "installer-admin-name",
  adminEmail: "installer-admin-email",
  adminPassword: "installer-admin-password",
  createAccount: "installer-create-account",
  licenseKey: "installer-license-key",
  activate: "installer-activate",
  startTrial: "installer-start-trial",
  complete: "installer-complete",
} as const;

test.describe("Installer Wizard", () => {
  test.beforeEach(async ({ request }) => {
    // Reset admin users so the installer setupAdmin mutation doesn't fail
    // with "Admin account already exists" (playwright-seed creates an admin).
    await request.post(`${BASE_URL}/api/trpc/installer.resetForTesting`, {
      data: { json: {} },
    });
  });
  test("navigates through all 5 installer steps", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/installer`, {
      waitUntil: "domcontentloaded",
    });

    // Step 0: System Check — wait for system check to complete
    // The page shows a spinner while loading, then shows system check results
    await expect(page.getByTestId(SELECTORS.nextStep0)).toBeVisible({
      timeout: 15000,
    });

    // Proceed to step 1 (Database Setup)
    await page.getByTestId(SELECTORS.nextStep0).click();

    // Step 1: Database Setup — verify next button is visible
    await expect(page.getByTestId(SELECTORS.nextStep1)).toBeVisible({
      timeout: 5000,
    });

    // Proceed to step 2 (Admin Account)
    await page.getByTestId(SELECTORS.nextStep1).click();

    // Step 2: Admin Account — fill in the form
    await expect(page.getByTestId(SELECTORS.adminName)).toBeVisible({
      timeout: 5000,
    });

    await page.getByTestId(SELECTORS.adminName).fill("Test Admin");
    await page.getByTestId(SELECTORS.adminEmail).fill("admin@rihlamate.test");
    await page.getByTestId(SELECTORS.adminPassword).fill("securepass123");

    // Create account button should be enabled once all fields are filled
    const createAccountBtn = page.getByTestId(SELECTORS.createAccount);
    await expect(createAccountBtn).toBeEnabled();

    // Proceed to step 3 (License Activation)
    await createAccountBtn.click();

    // Step 3: License Activation — verify form elements are visible
    await expect(page.getByTestId(SELECTORS.licenseKey)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId(SELECTORS.activate)).toBeVisible();
    await expect(page.getByTestId(SELECTORS.startTrial)).toBeVisible();

    // Activate button should be disabled when license key is empty
    await expect(page.getByTestId(SELECTORS.activate)).toBeDisabled();

    // Fill in a license key
    await page.getByTestId(SELECTORS.licenseKey).fill("RM-TEST-XXXX-XXXX-XXXX");
    await expect(page.getByTestId(SELECTORS.activate)).toBeEnabled();

    // Click start trial to proceed (doesn't depend on a valid license key)
    await page.getByTestId(SELECTORS.startTrial).click();

    // Wait for trial to complete, then proceed to step 4
    await expect(page.getByTestId(SELECTORS.nextStep3)).toBeEnabled({
      timeout: 10000,
    });
    await page.getByTestId(SELECTORS.nextStep3).click();

    // Step 4: Branding — verify complete button is visible
    await expect(page.getByTestId(SELECTORS.complete)).toBeVisible({
      timeout: 5000,
    });

    // Click complete
    await page.getByTestId(SELECTORS.complete).click();

    // After completion, the success message should appear
    await expect(page.getByText("Setup Complete!")).toBeVisible({
      timeout: 5000,
    });
  });

  test("back navigation works between steps", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/installer`, {
      waitUntil: "domcontentloaded",
    });

    // Wait for step 0 to be ready and proceed to step 1
    await expect(page.getByTestId(SELECTORS.nextStep0)).toBeVisible({
      timeout: 15000,
    });
    await page.getByTestId(SELECTORS.nextStep0).click();

    // Step 1: back button should be visible
    await expect(page.getByTestId(SELECTORS.back)).toBeVisible({
      timeout: 5000,
    });

    // Go back to step 0
    await page.getByTestId(SELECTORS.back).click();

    // Should be back on step 0 — next button should be visible again
    await expect(page.getByTestId(SELECTORS.nextStep0)).toBeVisible({
      timeout: 5000,
    });

    // Back button should NOT be visible on step 0
    await expect(page.getByTestId(SELECTORS.back)).not.toBeVisible();
  });

  test("admin form validation prevents empty submission", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/installer`, {
      waitUntil: "domcontentloaded",
    });

    // Navigate to step 2 (Admin Account)
    await expect(page.getByTestId(SELECTORS.nextStep0)).toBeVisible({
      timeout: 15000,
    });
    await page.getByTestId(SELECTORS.nextStep0).click();
    await expect(page.getByTestId(SELECTORS.nextStep1)).toBeVisible({
      timeout: 5000,
    });
    await page.getByTestId(SELECTORS.nextStep1).click();

    // Verify create account button is disabled with empty form
    await expect(page.getByTestId(SELECTORS.adminName)).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId(SELECTORS.createAccount)).toBeDisabled();

    // Fill only name — button should still be disabled
    await page.getByTestId(SELECTORS.adminName).fill("Test Admin");
    await expect(page.getByTestId(SELECTORS.createAccount)).toBeDisabled();

    // Fill email too — still disabled without password
    await page.getByTestId(SELECTORS.adminEmail).fill("admin@rihlamate.test");
    await expect(page.getByTestId(SELECTORS.createAccount)).toBeDisabled();

    // Fill all three — should be enabled
    await page.getByTestId(SELECTORS.adminPassword).fill("securepass123");
    await expect(page.getByTestId(SELECTORS.createAccount)).toBeEnabled();
  });
});
