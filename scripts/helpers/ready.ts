import { expect, type Page } from "@playwright/test";

/** Wait until dashboard page content is painted (not loading.tsx). */
export async function waitForPageHeading(page: Page, timeout = 15000) {
  const heading = page.getByTestId("page-heading");
  await expect(heading).toBeVisible({ timeout });
  return heading;
}
