import { test, expect } from "@playwright/test";
import { BASE_URL } from "./helpers/auth";

const SEL = {
  submitButton: '[data-testid="booking-submit"]',
  validationError: '[data-testid^="validation-error-"]',
} as const;

test.describe("debug validation rendering", () => {
  test("diagnostic: check setFieldErrors actually fires", async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/bookings/new`, {
      waitUntil: "load",
    });

    await page.waitForSelector('[data-testid="page-heading"]', { state: "visible", timeout: 10000 });

    // Patch validateForm to log what it does
    await page.evaluate(() => {
      // Expose the internal React component state via a proxy on setState
      const origDefineProperty = Object.defineProperty;
      let capturedSetFieldErrors: any = null;

      // After component mounts, find the form and attach a spy
      const observer = new MutationObserver(() => {
        const form = document.querySelector("form");
        if (form) {
          observer.disconnect();

          // Intercept submit handler at the form level to see what happens
          const origSubmit = HTMLFormElement.prototype.requestSubmit;
          HTMLFormElement.prototype.requestSubmit = function (this: HTMLFormElement, ...args: any[]) {
            (window as any).__requestSubmitCalled = true;
            (window as any).__requestSubmitArgs = args;
            return origSubmit.apply(this, args);
          };

          // Also check if React is calling a synthetic submit
          const origAddEventListener = HTMLFormElement.prototype.addEventListener;
          HTMLFormElement.prototype.addEventListener = function (this: HTMLFormElement, type: string, listener: any, options?: any) {
            if (type === "submit") {
              (window as any).__submitListenerRegistered = true;
            }
            return origAddEventListener.call(this, type, listener, options);
          };
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });

    // Click submit
    await page.locator(SEL.submitButton).click();
    await page.waitForTimeout(2000);

    const trace = await page.evaluate(() => ({
      url: window.location.href,
      errorCount: document.querySelectorAll('[data-testid^="validation-error-"]').length,
      requestSubmitCalled: (window as any).__requestSubmitCalled || false,
      submitListenerRegistered: (window as any).__submitListenerRegistered || false,
      // Check if any validation error elements exist in DOM at all
      domHtml: document.querySelector("form")?.innerHTML.includes("validation-error") ? "YES" : "NO",
      // Check if there are any p tags with id ending in -error
      errorIds: Array.from(document.querySelectorAll("p[id$='-error']")).map(el => el.id),
    }));

    console.log("[DIAGNOSTIC] Trace:", JSON.stringify(trace, null, 2));

    // If no validation errors, check if the fieldErrors state is actually set
    // by looking for the aria-describedby attributes pointing to error ids
    const ariaRefs = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[aria-describedby]")).map(el =>
        `${(el as HTMLElement).tagName}#${(el as HTMLElement).getAttribute("id")} -> ${(el as HTMLElement).getAttribute("aria-describedby")}`
      )
    );
    console.log("[DIAGNOSTIC] aria-describedby refs:", JSON.stringify(ariaRefs));

    // Take a screenshot to see what's actually rendered
    await page.screenshot({ path: "/tmp/validation-debug.png", fullPage: true });
    console.log("[DIAGNOSTIC] Screenshot saved to /tmp/validation-debug.png");
  });
});
