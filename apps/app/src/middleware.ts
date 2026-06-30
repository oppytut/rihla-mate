import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { env } from "@/env";
import { isLicenseValid, getActiveLicenseCount } from "@/lib/license/store";

/**
 * next-intl is configured as:
 *   locales: ["id", "en"], defaultLocale: "id", localePrefix: "as-needed"
 *
 * "as-needed" means the default locale ("id") omits the prefix, while
 * secondary locales like "en" include it.  This helper strips an "/en" prefix
 * so we can match route patterns regardless of locale.
 *
 *   /en/dashboard/settings  ->  /dashboard/settings
 *   /id/dashboard/settings  ->  /dashboard/settings   (default, no prefix)
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
  return /\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot|css|js|json|txt)$/i.test(
    pathname,
  );
}

async function checkLicense(): Promise<boolean> {
  if (env.LICENSE_KEY) {
    return isLicenseValid(db, env.LICENSE_KEY);
  }
  const count = await getActiveLicenseCount(db);
  return count > 0;
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const locale = extractLocale(pathname);

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  if (isHomepage(pathname)) {
    const hasLicense = await checkLicense();
    const url = request.nextUrl.clone();
    url.pathname = locale + (hasLicense ? "/dashboard" : "/activate");
    return NextResponse.redirect(url);
  }

  if (isDashboardRoute(pathname)) {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.session) {
      const url = request.nextUrl.clone();
      url.pathname = locale + "/sign-in";
      return NextResponse.redirect(url);
    }
  }

  const hasLicense = await checkLicense();

  if (!hasLicense) {
    const url = request.nextUrl.clone();
    url.pathname = locale + "/activate";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
