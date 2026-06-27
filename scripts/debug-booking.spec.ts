import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

const SEL = {
  customerName: '[data-testid="booking-customer-name"]',
  packageId: '[data-testid="booking-package"]',
  departureDateButton: '[data-testid="booking-departure-date"]',
  popoverContent: '[data-slot="popover-content"]',
  travelers: '[data-testid="booking-travelers"]',
  totalPrice: '[data-testid="booking-total-price"]',
  submitButton: '[data-testid="booking-submit"]',
  calendarNextButton: '[data-slot="calendar"] button[class*="button_next"]',
  calendarDay: (dateStr: string) => `[data-slot="calendar"] button[data-day*="${dateStr}"]`,
} as const;

test("debug form submission", async ({ page }) => {
  // Register ALL event listeners FIRST, before any navigation
  const trpcLog: string[] = [];
  const consoleLog: string[] = [];
  const dialogLog: string[] = [];

  page.on("request", (req) => {
    if (req.url().includes("trpc")) {
      const postData = req.postData();
      trpcLog.push(`REQUEST: ${req.method()} ${req.url()} POST=${postData ? postData.substring(0, 1000) : "none"}`);
    }
  });
  page.on("response", async (res) => {
    if (res.url().includes("trpc")) {
      try {
        const body = await res.text();
        trpcLog.push(`RESPONSE: ${res.status()} URL=${res.url().substring(0, 120)} BODY=${body.substring(0, 2000)}`);
      } catch {
        trpcLog.push(`RESPONSE: ${res.status()} URL=${res.url().substring(0, 120)} (body unavailable)`);
      }
    }
  });
  page.on("console", (msg) => {
    consoleLog.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => consoleLog.push(`PAGE_ERROR: ${err.message}`));
  page.on("dialog", (dialog) => {
    dialogLog.push(`DIALOG: ${dialog.message()}`);
    dialog.accept();
  });

  await page.goto(`${BASE_URL}/en/dashboard/bookings/new`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector('[data-testid="page-heading"]', { state: "visible", timeout: 10000 });

  await page.fill(SEL.customerName, "Debug Customer");

  const packageSelect = page.locator(SEL.packageId);
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel) as HTMLSelectElement;
      return el && el.options.length > 1;
    },
    SEL.packageId,
    { timeout: 10000 },
  );

  // Log all package options
  const packageOptions = await page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLSelectElement;
    return Array.from(el.options).map(o => ({ text: o.text, value: o.value }));
  }, SEL.packageId);
  console.log("Package options:", JSON.stringify(packageOptions.slice(0, 10)));

  // Select the first non-empty package option (index 1 skips the placeholder "Select a package")
  const firstPkgOption = packageSelect.locator("option[value]:not([value=''])").first();
  const firstPkgValue = await firstPkgOption.getAttribute("value");
  await packageSelect.selectOption(firstPkgValue ?? { index: 1 });

  await page.locator(SEL.departureDateButton).click();
  await page.waitForSelector(SEL.popoverContent, { state: "visible", timeout: 5000 });

  const monthsAhead = (2026 - new Date().getFullYear()) * 12 + (7 - (new Date().getMonth() + 1));
  for (let i = 0; i < monthsAhead; i++) {
    await page.locator(SEL.calendarNextButton).click();
    await page.waitForTimeout(100);
  }
  await page.locator(SEL.calendarDay("7/1/2026")).first().click();

  await page.fill(SEL.travelers, "2");
  await page.fill(SEL.totalPrice, "1500000");

  await page.waitForTimeout(3000);

  // Dump form state right before clicking submit
  const formState = await page.evaluate(() => {
    const pkg = document.querySelector('[data-testid="booking-package"]') as HTMLSelectElement;
    const name = document.querySelector('[data-testid="booking-customer-name"]') as HTMLInputElement;
    const travelers = document.querySelector('[data-testid="booking-travelers"]') as HTMLInputElement;
    const price = document.querySelector('[data-testid="booking-total-price"]') as HTMLInputElement;
    const dateBtn = document.querySelector('[data-testid="booking-departure-date"]') as HTMLElement;
    const submitBtn = document.querySelector('[data-testid="booking-submit"]') as HTMLButtonElement;
    return {
      packageValue: pkg?.value,
      customerName: name?.value,
      travelers: travelers?.value,
      totalPrice: price?.value,
      departureDateText: dateBtn?.innerText,
      submitDisabled: submitBtn?.disabled,
      url: window.location.href,
    };
  });
  console.log("Form state before submit:", JSON.stringify(formState));

  // Check for existing validation errors before clicking
  const beforeErrors = await page.evaluate(() => {
    const errs = document.querySelectorAll('[data-testid^="validation-error-"]');
    return Array.from(errs).map(e => e.textContent);
  });
  console.log("Validation errors before submit:", JSON.stringify(beforeErrors));

  // Check for any existing error/success banners
  const banners = await page.evaluate(() => {
    const els = document.querySelectorAll('.text-destructive, .bg-destructive\\/10, [role="alert"]');
    return Array.from(els).map(e => (e as HTMLElement).innerText.substring(0, 100));
  });
  console.log("Banners before submit:", JSON.stringify(banners));

  console.log("Clicking submit...");
  await page.locator(SEL.submitButton).click();

  // Wait longer to allow mutation + navigation
  await page.waitForTimeout(5000);

  const afterUrl = page.url();
  console.log("URL after submit:", afterUrl);

  // Dump trpc log
  require("fs").writeFileSync("/tmp/trpc-debug.json", JSON.stringify({ trpcLog, consoleLog: consoleLog.slice(-30), dialogLog, afterUrl }, null, 2));

  // Check for error elements after submit
  const errorInfo = await page.evaluate(() => {
    const errs: string[] = [];
    document.querySelectorAll('.text-destructive, .bg-destructive\\/10, [role="alert"], [data-testid^="validation-error-"]').forEach((el) => {
      errs.push(`${(el as HTMLElement).className.substring(0, 80)} | ${(el as HTMLElement).innerText.substring(0, 200)}`);
    });
    return errs;
  });
  console.log("Error elements after submit:", JSON.stringify(errorInfo));

  const html = await page.content();
  require("fs").writeFileSync("/tmp/debug-after-submit.html", html);
  await page.screenshot({ path: "/tmp/debug-after-submit.png", fullPage: true });
  console.log("Done. Check /tmp/trpc-debug.json and /tmp/debug-after-submit.{html,png}");
});
