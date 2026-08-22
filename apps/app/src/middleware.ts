/**
 * Middleware (formerly proxy.ts in Next.js 16).
 *
 * We keep the old `middleware.ts` convention instead of `proxy.ts` because:
 * 1. Next.js 16's proxy.ts defaults to Node.js runtime and forbids `runtime = "edge"`
 * 2. @opennextjs/cloudflare does NOT support Node.js middleware (it errors at build time)
 * 3. middleware.ts still works in Next.js 16 (with deprecation warning) and defaults to Edge runtime
 * 4. OpenNext Cloudflare detects edge middleware and handles it correctly
 *
 * This runs on every request to handle i18n locale negotiation via next-intl.
 * next-intl's createMiddleware is fully Edge-compatible (Web APIs only).
 */
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import {
  hostnameFromHostHeader,
  isBureauHostname,
  isMarketingPath,
  isProductHostname,
  isProductInstancePath,
  LAB_DEMO_ORIGIN,
  PRODUCT_ORIGIN,
  stripLocalePrefix,
} from "./lib/site-mode";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const hostname = hostnameFromHostHeader(request.headers.get("host"));
  const pathname = request.nextUrl.pathname;
  const logicalPath = stripLocalePrefix(pathname, routing.locales);

  if (isProductHostname(hostname) && isProductInstancePath(logicalPath)) {
    return NextResponse.redirect(new URL(logicalPath, LAB_DEMO_ORIGIN));
  }

  if (isBureauHostname(hostname) && isMarketingPath(logicalPath)) {
    return NextResponse.redirect(new URL("/", PRODUCT_ORIGIN));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
