export const LAB_DEMO_ORIGIN = "https://demo.rihla.my.id";
export const PRODUCT_ORIGIN = "https://rihla.my.id";

const PRODUCT_INSTANCE_PATHS = [
  "/sign-in",
  "/dashboard",
  "/installer",
  "/activate",
  "/forgot-password",
  "/reset-password",
] as const;

export function hostnameFromHostHeader(hostHeader: string | null | undefined): string {
  if (!hostHeader) return "";
  return hostHeader.split(",")[0]?.trim().split(":")[0]?.toLowerCase() ?? "";
}

export function isProductHostname(hostname: string): boolean {
  return hostname === "rihla.my.id" || hostname === "www.rihla.my.id";
}

export function isLocalDevHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".localhost")
  );
}

export function isBureauHostname(hostname: string): boolean {
  if (!hostname) return false;
  if (isProductHostname(hostname)) return false;
  if (isLocalDevHostname(hostname)) return false;
  return true;
}

export function staffSignInHrefForHost(hostname: string): string {
  if (isProductHostname(hostname)) {
    return `${LAB_DEMO_ORIGIN}/sign-in`;
  }
  return "/sign-in";
}

export function stripLocalePrefix(pathname: string, locales: readonly string[]): string {
  for (const loc of locales) {
    if (pathname === `/${loc}`) return "/";
    if (pathname.startsWith(`/${loc}/`)) {
      return pathname.slice(loc.length + 1);
    }
  }
  return pathname;
}

export function isProductInstancePath(pathname: string): boolean {
  return PRODUCT_INSTANCE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isMarketingPath(pathname: string): boolean {
  return pathname === "/marketing" || pathname.startsWith("/marketing/");
}

export function isProductDocsPath(pathname: string): boolean {
  return pathname === "/guide" || pathname.startsWith("/guide/");
}

export function isBureauCatalogPath(pathname: string): boolean {
  return pathname === "/packages" || pathname.startsWith("/packages/");
}

const BUREAU_AUTH_PATHS = ["/sign-in", "/forgot-password", "/reset-password"] as const;

export function isBureauAuthPath(pathname: string): boolean {
  return BUREAU_AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function surfaceRedirectUrl(
  hostname: string,
  pathname: string,
  locales: readonly string[],
): string | null {
  const logicalPath = stripLocalePrefix(pathname, locales);
  if (isProductHostname(hostname) && isProductInstancePath(logicalPath)) {
    return new URL(logicalPath, LAB_DEMO_ORIGIN).toString();
  }
  if (isBureauHostname(hostname) && isMarketingPath(logicalPath)) {
    return new URL("/", PRODUCT_ORIGIN).toString();
  }
  if (isBureauHostname(hostname) && isProductDocsPath(logicalPath)) {
    return new URL(logicalPath, PRODUCT_ORIGIN).toString();
  }
  return null;
}

const BUREAU_NAV_KEYS = [
  "packages",
  "howToBook",
  "contact",
  "staffSignIn",
  "menu",
  "close",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickKeys(
  source: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in source) out[key] = source[key];
  }
  return out;
}

const BUREAU_PUBLIC_DROP_NAMESPACES = [
  "installer",
  "dashboard",
  "activate",
  "email",
  "customers",
  "media",
  "license",
  "landingPages",
  "pages",
  "analytics",
  "settings",
  "users",
  "auth",
  "notifications",
  "landing",
  "guide",
] as const;

const BUREAU_CATALOG_NAMESPACES = ["packages", "validation", "bookings"] as const;

const BUREAU_AUTH_KEYS = [
  "signIn",
  "signInToAccount",
  "signInFailed",
  "signInWithGoogle",
  "email",
  "password",
  "orContinueWith",
  "signInHelp",
  "emailPlaceholder",
  "passwordPlaceholder",
  "backToHome",
  "secureNote",
  "trialOrActivate",
  "forgotPassword",
  "forgotPasswordTitle",
  "forgotPasswordHelp",
  "sendResetLink",
  "resetEmailSent",
  "resetPasswordTitle",
  "resetPasswordHelp",
  "newPassword",
  "confirmPassword",
  "passwordMismatch",
  "resetSuccess",
  "resetFailed",
  "invalidResetToken",
  "backToSignIn",
] as const;

const BUREAU_PUBLIC_COMMON_KEYS = [
  "appName",
  "appNameAbbr",
  "loading",
  "error",
  "success",
  "previous",
  "next",
  "tryAgain",
  "somethingWentWrong",
  "unexpectedError",
] as const;

const BUREAU_PUBLIC_BUREAU_KEYS = [
  "title",
  "description",
  "heroEyebrow",
  "heroTitle",
  "heroLead",
  "ctaPackages",
  "emptyPackages",
  "durationDays",
  "fromPrice",
  "viewPackage",
  "filterCategory",
  "filterAll",
  "howTitle",
  "howLead",
  "contactLead",
  "copyright",
] as const;

export function pickBureauClientMessages(
  messages: Record<string, unknown>,
  options: { catalog?: boolean; auth?: boolean } = {},
): Record<string, unknown> {
  const drop = new Set<string>(BUREAU_PUBLIC_DROP_NAMESPACES);
  if (options.auth) drop.delete("auth");
  if (!options.catalog) {
    for (const key of BUREAU_CATALOG_NAMESPACES) drop.add(key);
  }
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(messages)) {
    if (!drop.has(key)) next[key] = value;
  }
  const common = messages.common;
  next.common = isRecord(common) ? pickKeys(common, BUREAU_PUBLIC_COMMON_KEYS) : {};
  if (options.auth) {
    const auth = messages.auth;
    next.auth = isRecord(auth) ? pickKeys(auth, BUREAU_AUTH_KEYS) : {};
  }
  const marketing = messages.marketing;
  if (!isRecord(marketing)) {
    delete next.marketing;
    return next;
  }
  const nav = isRecord(marketing.nav) ? pickKeys(marketing.nav, BUREAU_NAV_KEYS) : {};
  const bureauSource = isRecord(marketing.bureau) ? marketing.bureau : {};
  next.marketing = {
    nav,
    bureau: pickKeys(bureauSource, BUREAU_PUBLIC_BUREAU_KEYS),
  };
  return next;
}
