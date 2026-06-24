import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { db } from "@/lib/db/client";
import { env } from "@/env";
import { isLicenseValid, getActiveLicenseCount } from "@/lib/license/store";

// ---------------------------------------------------------------------------
// Public routes — no license check required
// ---------------------------------------------------------------------------

const PUBLIC_ROUTES = [
  "/activate",
  "/api/auth",
  "/api/trpc",
  "/_next",
  "/favicon.ico",
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes through without a license check.
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Skip license check for static assets (images, fonts, etc.).
  // We match file extensions that are typically static.
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot|css|js|json|txt)$/i.test(pathname)) {
    return NextResponse.next();
  }

  // --- License check ---
  let hasValidLicense = false;

  // 1. If LICENSE_KEY env var is set, validate it directly.
  if (env.LICENSE_KEY) {
    hasValidLicense = await isLicenseValid(db, env.LICENSE_KEY);
  } else {
    // 2. Otherwise, check if any active license exists in the database.
    const count = await getActiveLicenseCount(db);
    hasValidLicense = count > 0;
  }

  if (hasValidLicense) {
    return NextResponse.next();
  }

  // No valid license found — redirect to the activation page.
  const url = request.nextUrl.clone();
  url.pathname = "/activate";
  return NextResponse.redirect(url);
}

// ---------------------------------------------------------------------------
// Matcher config — run middleware on all routes except truly internal ones
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    // Skip all internal files (_next) and static assets — handled above,
    // but Next.js recommends listing them in the matcher for performance.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
