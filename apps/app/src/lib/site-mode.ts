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
