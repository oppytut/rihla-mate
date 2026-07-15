/**
 * Cloudflare Workers cron handler — runs LICENSE_CHECKIN on schedule.
 *
 * Compiled separately by scripts/inject-cron-handler.mjs and injected
 * into .open-next/worker.js as a scheduled export.
 */

/// <reference types="@cloudflare/workers-types" />

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq } from "drizzle-orm";
import type { LicensePlan } from "@rihla-mate/shared";
import * as schema from "../src/lib/db/schema";
import { licenseKeys } from "../src/lib/license/store";

// Enable HTTP fetch queries for Cloudflare Workers compatibility
neonConfig.poolQueryViaFetch = true;

interface ValidateResponse {
  valid: boolean;
  reason?: string;
  expiresAt?: string;
  seats?: number;
  plan?: string;
}

interface LicenseCheckInResult {
  valid: boolean;
  reason?: string;
  expiresAt?: Date;
  seats?: number;
  plan?: string;
}

function getLicenseServerUrl(env: Record<string, string | undefined>): string {
  return env.LICENSE_SERVER_URL ?? "http://localhost:3001";
}

async function verifyLicenseWithServer(
  licenseKey: string,
  serverUrl: string,
): Promise<ValidateResponse> {
  const url = `${serverUrl}/api/validate/${encodeURIComponent(licenseKey)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { valid: false, reason: "INVALID_LICENSE" };
    }
    return (await response.json()) as ValidateResponse;
  } catch {
    console.error(`[cron] Network error validating license: ${licenseKey}`);
    return { valid: false, reason: "NETWORK_ERROR" };
  }
}

async function checkIn(
  db: ReturnType<typeof drizzle>,
  licenseKey: string,
  env: Record<string, string | undefined>,
): Promise<LicenseCheckInResult> {
  const serverUrl = getLicenseServerUrl(env);
  const serverResponse = await verifyLicenseWithServer(licenseKey, serverUrl);

  if (!serverResponse.valid) {
    console.warn(`[cron] License check-in failed: ${serverResponse.reason} (key: ${licenseKey})`);
    return { valid: false, reason: serverResponse.reason ?? "INVALID_LICENSE" };
  }

  try {
    await db.transaction(async (tx) => {
      await tx.delete(licenseKeys).where(eq(licenseKeys.key, licenseKey));
      await tx.insert(licenseKeys).values({
        key: licenseKey,
        type: (serverResponse.plan as LicensePlan | "trial") ?? "pro",
        seats: serverResponse.seats ?? 1,
        expiresAt: serverResponse.expiresAt ? new Date(serverResponse.expiresAt) : null,
        metadata: { lastCheckinAt: new Date().toISOString() },
      });
    });
    console.log(`[cron] License check-in successful: ${licenseKey}`);
  } catch (err) {
    console.error(`[cron] Failed to update local license:`, err);
    return { valid: false, reason: "DB_ERROR" };
  }

  return {
    valid: true,
    expiresAt: serverResponse.expiresAt ? new Date(serverResponse.expiresAt) : undefined,
    seats: serverResponse.seats,
    plan: serverResponse.plan,
  };
}

export async function scheduled(
  event: ScheduledEvent,
  env: Record<string, unknown>,
  _ctx: ExecutionContext,
): Promise<void> {
  const cron = (event as { cron?: string }).cron;
  console.log(`[cron] LICENSE_CHECKIN triggered${cron ? ` (${cron})` : ""}`);

  const licenseKey = (env as Record<string, string | undefined>).LICENSE_KEY;
  if (!licenseKey) {
    console.warn("[cron] LICENSE_KEY not set — skipping check-in");
    return;
  }

  const databaseUrl = (env as Record<string, string | undefined>).DATABASE_URL;
  if (!databaseUrl) {
    console.error("[cron] DATABASE_URL not set — skipping check-in");
    return;
  }

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const db = drizzle({ client: pool, schema });
    const result = await checkIn(db, licenseKey, env as Record<string, string | undefined>);
    if (result.valid) {
      console.log(
        `[cron] License check-in OK — expires: ${result.expiresAt?.toISOString() ?? "never"}, plan: ${result.plan ?? "unknown"}`,
      );
    }
  } finally {
    await pool.end();
  }
}
