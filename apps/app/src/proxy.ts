import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { env } from "@/env";
import { isLicenseValid, getActiveLicenseCount } from "@/lib/license/store";

/**
 * next-intl locale handling.
 *
 * locales: ["id", "en"], defaultLocale: "id", localePrefix: "as-needed"
 *
 * "as-needed" means the default locale ("id") omits the prefix, while
 * secondary locales like "en" include it.
 */
const intlMiddleware = createIntlMiddleware(routing);

/**
 * Strips an "/en" locale prefix so we can match route patterns
 * regardless of locale.
 *
 *   /en/dashboard/settings  ->  /dashboard/settings
 *   /dashboard              ->  /dashboard
 */
function stripLocalePrefix(pathname: string): string {
  if (pathname.startsWith("/en/")) {
    return pathname.slice(3);
  }
  if (pathname === "/en") {
    return "/";
  }
  return pathname;
}

function extractLocale(pathname: string): string {
  if (pathname.startsWith("/en/") || pathname === "/en") {
    return "/en";
  }
  return "";
}

const PUBLIC_PREFIXES = [
  "/activate",
  "/installer",
  "/api/auth",
  "/api/trpc",
  "/api/health",
  "/api/midtrans",
  "/sign-in",
];

function isPublicRoute(pathname: string): boolean {
  const stripped = stripLocalePrefix(pathname);
  return PUBLIC_PREFIXES.some((prefix) => stripped.startsWith(prefix));
}

function isDashboardRoute(pathname: string): boolean {
  const stripped = stripLocalePrefix(pathname);
  return stripped.startsWith("/dashboard");
}

function isHomepage(pathname: string): boolean {
  const stripped = stripLocalePrefix(pathname);
  return stripped === "/";
}

function isStaticAsset(pathname: string): boolean {
  return /\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot|css|js|json|txt)$/i.test(pathname);
}

async function checkLicense(): Promise<boolean> {
  if (env.LICENSE_KEY) {
    return isLicenseValid(db, env.LICENSE_KEY);
  }
  const count = await getActiveLicenseCount(db);
  return count > 0;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Let next-intl handle locale resolution first
  const intlResponse = intlMiddleware(request);

  // If next-intl decided to redirect or rewrite, return that immediately
  // EXCEPT for API routes: intlMiddleware rewrites e.g. /api/auth/sign-in/email
  // → /id/api/auth/sign-in/email which 404s in production because no route
  // handler exists at the rewritten path.
  // Also skip 307 redirects for API routes: intlMiddleware redirects e.g.
  // /api/trpc/user.me → /en/api/trpc/user.me to add locale prefix, but API
  // routes should never be locale-prefixed.
  if (
    (intlResponse.status === 307 && !pathname.startsWith("/api/")) ||
    (!pathname.startsWith("/api/") &&
      (intlResponse.headers.get("x-nextjs-rewrite") ||
        intlResponse.headers.get("x-middleware-rewrite")))
  ) {
    return intlResponse;
  }

  // 2. Run auth/license logic on the (now locale-resolved) request
  const locale = extractLocale(pathname);

  if (isPublicRoute(pathname) || isStaticAsset(pathname)) {
    // For API routes, intlResponse is a rewrite (NextResponse.rewrite) that
    // would change /api/auth/... → /id/api/auth/... causing 404 in production.
    // Pass through with NextResponse.next() instead, carrying the locale header.
    const requestHeaders = new Headers(request.headers);
    const localeHeader = intlResponse.headers.get("x-next-intl-locale");
    if (localeHeader) requestHeaders.set("x-next-intl-locale", localeHeader);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (isHomepage(pathname)) {
    const hasLicense = await checkLicense();
    const url = request.nextUrl.clone();
    url.pathname = locale + (hasLicense ? "/dashboard" : "/activate");
    return new Response(null, {
      status: 307,
      headers: { Location: url.toString() },
    });
  }

  if (isDashboardRoute(pathname)) {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.session) {
      const url = request.nextUrl.clone();
      url.pathname = locale + "/sign-in";
      return new Response(null, {
        status: 307,
        headers: { Location: url.toString() },
      });
    }
  }

  const hasLicense = await checkLicense();

  if (!hasLicense) {
    const url = request.nextUrl.clone();
    url.pathname = locale + "/activate";
    return new Response(null, {
      status: 307,
      headers: { Location: url.toString() },
    });
  }

  return intlResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
