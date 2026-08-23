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
import { hostnameFromHostHeader, surfaceRedirectUrl } from "./lib/site-mode";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const hostname = hostnameFromHostHeader(request.headers.get("host"));
  const redirectTo = surfaceRedirectUrl(hostname, request.nextUrl.pathname, routing.locales);
  if (redirectTo) {
    return NextResponse.redirect(redirectTo);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return intlMiddleware(new NextRequest(request, { headers: requestHeaders }));
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
