export type PasswordEmailKind = "invite" | "reset";
export type AppLocale = "id" | "en" | "ar";

const LOCALES = new Set<string>(["id", "en", "ar"]);

let kind: PasswordEmailKind = "reset";
let locale: AppLocale | null = null;

export function normalizeAppLocale(value: string | null | undefined): AppLocale {
  if (value && LOCALES.has(value)) {
    return value as AppLocale;
  }
  return "id";
}

export function getPasswordEmailKind(): PasswordEmailKind {
  return kind;
}

export function getPasswordEmailLocale(): AppLocale | null {
  return locale;
}

export async function withPasswordEmailKind<T>(
  next: PasswordEmailKind,
  fn: () => Promise<T>,
): Promise<T> {
  const prev = kind;
  kind = next;
  try {
    return await fn();
  } finally {
    kind = prev;
  }
}

export async function withPasswordEmailLocale<T>(
  next: string | null | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  const prev = locale;
  locale = next == null || next === "" ? null : normalizeAppLocale(next);
  try {
    return await fn();
  } finally {
    locale = prev;
  }
}

export function localeFromCookieHeader(cookieHeader: string | null | undefined): AppLocale {
  if (!cookieHeader) return "id";
  const match = cookieHeader.match(/(?:^|;\s*)locale=([^;]+)/);
  if (!match?.[1]) return "id";
  try {
    return normalizeAppLocale(decodeURIComponent(match[1].trim()));
  } catch {
    return "id";
  }
}

export async function withInvitePasswordEmail<T>(
  cookieHeader: string | null | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  return withPasswordEmailLocale(localeFromCookieHeader(cookieHeader), () =>
    withPasswordEmailKind("invite", fn),
  );
}
