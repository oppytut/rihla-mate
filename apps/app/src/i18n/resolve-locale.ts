import { routing } from "./routing";

export type AppLocale = (typeof routing.locales)[number];

export function resolveAppLocale(...candidates: Array<string | undefined | null>): AppLocale {
  for (const value of candidates) {
    if (!value) continue;
    const normalized = value.trim().toLowerCase();
    if ((routing.locales as readonly string[]).includes(normalized)) {
      return normalized as AppLocale;
    }
  }
  return routing.defaultLocale;
}
