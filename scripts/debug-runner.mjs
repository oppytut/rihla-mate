/**
 * Minimal diagnostic runner — bypasses Playwright test runner to capture ALL console output.
 * Uses the same storageState from global setup.
 */
import { chromium } from "@playwright/test";
import { existsSync } from "fs";

const BASE_URL = "http://localhost:3000";
const STORAGE_STATE = "/home/ubuntu/bench/rihla-mate/.playwright-storage.json";

if (!existsSync(STORAGE_STATE)) {
  console.error("No storage state found. Run global setup first.");
  process.exit(1);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: STORAGE_STATE,
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();
  const logs = [];
  page.on("console", (msg) => logs.push(`[BROWSER ${msg.type()}] ${msg.text()}`));

  console.log("[RUNNER] Navigating to bookings/new...");
  await page.goto(`${BASE_URL}/en/dashboard/bookings/new`, { waitUntil: "load" });
  await page.waitForSelector('[data-testid="page-heading"]', { state: "visible", timeout: 10000 });

  // Inject diagnostic probes BEFORE clicking submit
  await page.evaluate(() => {
    // 1. Track if form submit handler runs
    const form = document.querySelector("form");
    if (form) {
      const origSubmit = form.submit.bind(form);
      form.submit = function () {
        (window).__nativeSubmitCalled = true;
        return origSubmit();
      };
      const origReqSubmit = form.requestSubmit.bind(form);
      form.requestSubmit = function () {
        (window).__requestSubmitCalled = true;
        return origReqSubmit();
      };
      // 2. Track submit event listeners
      form.addEventListener("submit", (e) => {
        (window).__submitEventFired = true;
        console.log("[DIAG] Native submit event fired on form!", e.defaultPrevented);
      });
      // 3. Track click event on submit button
      form.addEventListener("click", (e) => {
        const target = e.target;
        if (target && target.tagName === "BUTTON" && target.type === "submit") {
          console.log("[DIAG] Click on submit button detected. Target:", target.outerHTML.substring(0, 200));
        }
      });
    }
  });

  console.log("[RUNNER] Clicking submit button...");
  await page.locator('[data-testid="booking-submit"]').click();

  // Wait for React to process
  await page.waitForTimeout(3000);

  // Gather all diagnostics
  const diag = await page.evaluate(() => ({
    url: window.location.href,
    validationErrorCount: document.querySelectorAll('[data-testid^="validation-error-"]').length,
    validationErrorTexts: Array.from(document.querySelectorAll('[data-testid^="validation-error-"]')).map(el => ({
      testid: el.getAttribute("data-testid"),
      text: el.textContent,
    })),
    nativeSubmitCalled: (window).__nativeSubmitCalled || false,
    requestSubmitCalled: (window).__requestSubmitCalled || false,
    submitEventFired: (window).__submitEventFired || false,
    formHtml: document.querySelector("form")?.innerHTML?.includes("validation-error") ? "HAS_VALIDATION_ERROR_STRINGS" : "NO_VALIDATION_ERROR_STRINGS",
    // Check if the form has an onSubmit handler
    formOnSubmit: document.querySelector("form")?.getAttribute("onsubmit") || "none",
    // Check for aria-describedby refs
    ariaRefs: Array.from(document.querySelectorAll("[aria-describedby]")).map(el => ({
      tag: el.tagName,
      id: el.id,
      describedBy: el.getAttribute("aria-describedby"),
    })),
    // Check field values
    formFields: {
      customerName: document.querySelector('[data-testid="booking-customer-name"]')?.value,
      packageId: document.querySelector('[data-testid="booking-package"]')?.value,
      departureDate: document.querySelector('[data-testid="booking-departure-date"]')?.textContent?.trim(),
      totalPrice: document.querySelector('[data-testid="booking-total-price"]')?.value,
      travelers: document.querySelector('[data-testid="booking-travelers"]')?.value,
    },
  }));

  console.log("\n[RUNNER] === DIAGNOSTIC RESULTS ===");
  console.log(JSON.stringify(diag, null, 2));
  console.log("\n[RUNNER] === BROWSER LOGS ===");
  logs.forEach(l => console.log(l));

  // Take screenshot
  await page.screenshot({ path: "/tmp/validation-debug-v2.png", fullPage: true });
  console.log("[RUNNER] Screenshot saved to /tmp/validation-debug-v2.png");

  await browser.close();
}

main().catch((err) => {
  console.error("[RUNNER] Fatal:", err);
  process.exit(1);
});
