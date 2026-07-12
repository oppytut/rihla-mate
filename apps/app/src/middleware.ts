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
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except:
  // - /api, /trpc, /_next, /_vercel (internal routes)
  // - files with extensions (static assets)
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
