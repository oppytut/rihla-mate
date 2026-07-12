/**
 * Better Auth configuration — supports both VPS and Cloudflare Workers runtimes.
 *
 * VPS: Static `auth` export (synchronous, uses drizzleAdapter + nextCookies).
 * Cloudflare Workers: Async `initAuth()` singleton (uses withCloudflare for
 *   KV secondary storage, geolocation, IP detection; keeps nextCookies for
 *   cookie handling via OpenNext polyfill).
 */

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { env } from "@/env";

// ---------------------------------------------------------------------------
// Database adapter factory
// ---------------------------------------------------------------------------

function makeDrizzleAdapter(dbInstance: typeof db) {
  return drizzleAdapter(dbInstance, {
    provider: "pg",
    usePlural: true,
    schema: {
      ...schema,
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  });
}

// ---------------------------------------------------------------------------
// Shared auth options (common to both runtimes)
// ---------------------------------------------------------------------------

const baseOptions = {
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string" as const,
        required: false,
        defaultValue: "staff" as const,
        input: false,
      },
    },
  },
  socialProviders: {
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
      : {}),
  },
  plugins: [nextCookies()],
  advanced: {
    database: {
      generateId: "uuid" as const,
    },
  },
} satisfies Parameters<typeof betterAuth>[0];

// ---------------------------------------------------------------------------
// VPS — synchronous static export
// ---------------------------------------------------------------------------

export const auth = betterAuth({
  database: makeDrizzleAdapter(db),
  ...baseOptions,
});

// ---------------------------------------------------------------------------
// Cloudflare Workers — async singleton (initAuth)
// ---------------------------------------------------------------------------

let cfAuthInstance: Awaited<ReturnType<typeof buildCfAuth>> | null = null;

async function buildCfAuth() {
  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { withCloudflare } = await import("better-auth-cloudflare");
  const { db: cfDb } = await import("@/lib/db/client");

  const cfCtx = getCloudflareContext<Record<string, unknown>>();

  return betterAuth({
    // withCloudflare handles KV secondary storage, geolocation, IP detection.
    // Database adapter is passed separately (same drizzleAdapter as VPS but
    // with the CF runtime db client from @/lib/db/client).
    ...withCloudflare(
      {
        autoDetectIpAddress: true,
        geolocationTracking: true,
        cf: cfCtx.cf,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- KV type not available without @cloudflare/workers-types in prod
        kv: (cfCtx.env as Record<string, unknown>).KV as any,
      },
      {
        baseURL: env.BETTER_AUTH_URL,
        emailAndPassword: { enabled: true },
        rateLimit: {
          enabled: true,
          window: 60,
          max: 100,
        },
      },
    ),
    database: makeDrizzleAdapter(cfDb),
    ...baseOptions,
  });
}

/**
 * Async singleton for Cloudflare Workers runtime.
 * Call this from API routes and server components when deploying on CF.
 */
export async function initAuth() {
  if (!cfAuthInstance) {
    cfAuthInstance = await buildCfAuth();
  }
  return cfAuthInstance;
}
