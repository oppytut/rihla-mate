import type { Locator, Page } from "@playwright/test";

export function nativeSelect(root: Page | Locator, testId: string): Locator {
  return root.locator(`select[data-testid="${testId}"]`);
}

export async function selectNative(
  root: Page | Locator,
  testId: string,
  value: string,
): Promise<void> {
  await nativeSelect(root, testId).selectOption(value, { force: true });
}
