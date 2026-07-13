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
import { getDb, type DrizzleClient } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { env } from "@/env";

// ---------------------------------------------------------------------------
// Database adapter factory
// ---------------------------------------------------------------------------

function makeDrizzleAdapter(dbInstance: DrizzleClient) {
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
// VPS — lazy singleton (deferred until db is initialized)
// ---------------------------------------------------------------------------

type VpsAuth = Awaited<ReturnType<typeof buildVpsAuth>>;

let _auth: VpsAuth | undefined;

export function getAuth(): VpsAuth {
  if (!_auth) {
    throw new Error("auth not initialized. Call initAuth() before accessing auth instance.");
  }
  return _auth;
}

/**
 * Get or lazily initialize auth for VPS runtime.
 * Used by the auth route handler — if instrumentation failed to init,
 * the first request will trigger lazy initialization.
 */
export async function getOrInitAuth(): Promise<VpsAuth> {
  if (_auth) return _auth;
  const db = await getDb();
  const { setDb } = await import("@/lib/db/client");
  setDb(db);
  return initVpsAuth();
}

async function buildVpsAuth() {
  const db = await getDb();
  return betterAuth({
    database: makeDrizzleAdapter(db),
    ...baseOptions,
  });
}

/**
 * Initialize auth for VPS runtime. Must be called AFTER setDb().
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function initVpsAuth(): Promise<VpsAuth> {
  if (_auth) return _auth;
  _auth = await buildVpsAuth();
  return _auth;
}

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
