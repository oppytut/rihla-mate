/**
 * Cloudflare Workers cron handler — runs LICENSE_CHECKIN on schedule.
 *
 * Compiled separately by scripts/inject-cron-handler.mjs and injected
 * into .open-next/worker.js as a scheduled export.
 */

/// <reference types="@cloudflare/workers-types" />

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import type { LicensePlan, LicensePayload } from "@rihla-mate/shared";
import * as schema from "../src/lib/db/schema";
import { licenseKeys } from "../src/lib/license/store";

interface ValidateResponse {
  valid: boolean;
  reason?: string;
  expiresAt?: string;
  seats?: number;
  plan?: string;
  licenseId?: string;
  instanceId?: string;
}

interface LicenseCheckInResult {
  valid: boolean;
  reason?: string;
  expiresAt?: Date;
  seats?: number;
  plan?: string;
}

function getLicenseServerUrl(env: Record<string, string | undefined>): string {
  return (env.LICENSE_SERVER_URL ?? "http://localhost:3001").replace(/\/$/, "");
}

function getInstanceId(env: Record<string, string | undefined>): string {
  return env.INSTANCE_ID ?? "rihla-mate-cf-production";
}

function authHeaders(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "X-API-Key": apiKey,
  };
}

function base64urlDecode(str: string): Uint8Array {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return new Uint8Array(Buffer.from(b64, "base64"));
}

function decodeLicensePayload(licenseKey: string): LicensePayload | null {
  try {
    const parts = licenseKey.split(".");
    if (parts.length !== 3 || parts[0] !== "RML1") return null;
    const payloadJson = new TextDecoder().decode(base64urlDecode(parts[1]));
    return JSON.parse(payloadJson) as LicensePayload;
  } catch {
    return null;
  }
}

async function activateWithServer(
  licenseKey: string,
  env: Record<string, string | undefined>,
): Promise<ValidateResponse> {
  const apiKey = env.LICENSE_API_KEY;
  if (!apiKey) return { valid: false, reason: "MISSING_API_KEY" };

  const instanceId = getInstanceId(env);
  const url = `${getLicenseServerUrl(env)}/api/v1/activate`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify({ licenseKey, instanceId }),
    });
    const body = (await response.json()) as {
      success?: boolean;
      license?: { licenseId?: string; plan?: string; expiresAt?: string };
      code?: string;
      error?: string;
    };
    if (!response.ok || !body.success || !body.license) {
      return { valid: false, reason: body.code ?? body.error ?? "INVALID_LICENSE" };
    }
    return {
      valid: true,
      plan: body.license.plan,
      expiresAt: body.license.expiresAt,
      seats: 1,
      licenseId: body.license.licenseId,
      instanceId,
    };
  } catch {
    console.error(`[cron] Network error activating license`);
    return { valid: false, reason: "NETWORK_ERROR" };
  }
}

async function checkinWithServer(
  licenseId: string,
  env: Record<string, string | undefined>,
): Promise<ValidateResponse> {
  const apiKey = env.LICENSE_API_KEY;
  if (!apiKey) return { valid: false, reason: "MISSING_API_KEY" };

  const instanceId = getInstanceId(env);
  const url = `${getLicenseServerUrl(env)}/api/v1/checkin`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify({ licenseId, instanceId }),
    });
    const body = (await response.json()) as {
      status?: string;
      plan?: string;
      expiresAt?: string;
      error?: string;
    };
    if (!response.ok) {
      return { valid: false, reason: body.error ?? "INVALID_LICENSE" };
    }
    if (body.status === "revoked" || body.status === "expired") {
      return { valid: false, reason: body.status.toUpperCase(), plan: body.plan };
    }
    return {
      valid: true,
      plan: body.plan,
      expiresAt: body.expiresAt,
      seats: 1,
      licenseId,
      instanceId,
    };
  } catch {
    console.error(`[cron] Network error checking in license`);
    return { valid: false, reason: "NETWORK_ERROR" };
  }
}

async function verifyLicenseWithServer(
  licenseKey: string,
  env: Record<string, string | undefined>,
): Promise<ValidateResponse> {
  const payload = decodeLicensePayload(licenseKey);
  if (!payload?.licenseId) {
    return activateWithServer(licenseKey, env);
  }

  const checkinResult = await checkinWithServer(payload.licenseId, env);
  if (checkinResult.valid) {
    return {
      ...checkinResult,
      plan: checkinResult.plan ?? payload.plan,
      expiresAt: checkinResult.expiresAt ?? payload.expiresAt,
    };
  }

  if (checkinResult.reason === "MISSING_API_KEY") return checkinResult;
  if (
    checkinResult.reason === "Instance not activated for this license" ||
    checkinResult.reason === "INVALID_LICENSE"
  ) {
    return activateWithServer(licenseKey, env);
  }
  return checkinResult;
}

async function checkIn(
  db: ReturnType<typeof drizzle>,
  licenseKey: string,
  env: Record<string, string | undefined>,
): Promise<LicenseCheckInResult> {
  const serverResponse = await verifyLicenseWithServer(licenseKey, env);

  if (!serverResponse.valid) {
    console.warn(`[cron] License check-in failed: ${serverResponse.reason} (key: ${licenseKey})`);
    return { valid: false, reason: serverResponse.reason ?? "INVALID_LICENSE" };
  }

  try {
    await db.delete(licenseKeys).where(eq(licenseKeys.key, licenseKey));
    await db.insert(licenseKeys).values({
      key: licenseKey,
      type: (serverResponse.plan as LicensePlan | "trial") ?? "pro",
      seats: serverResponse.seats ?? 1,
      expiresAt: serverResponse.expiresAt ? new Date(serverResponse.expiresAt) : null,
      metadata: {
        lastCheckinAt: new Date().toISOString(),
        licenseId: serverResponse.licenseId,
        instanceId: serverResponse.instanceId ?? getInstanceId(env),
      },
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

  const envStr = env as Record<string, string | undefined>;
  const licenseKey = envStr.LICENSE_KEY;
  if (!licenseKey) {
    console.warn("[cron] LICENSE_KEY not set — skipping check-in");
    return;
  }

  const databaseUrl = envStr.DATABASE_URL;
  if (!databaseUrl) {
    console.error("[cron] DATABASE_URL not set — skipping check-in");
    return;
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql, { schema });
  const result = await checkIn(db, licenseKey, envStr);
  if (result.valid) {
    console.log(
      `[cron] License check-in OK — expires: ${result.expiresAt?.toISOString() ?? "never"}, plan: ${result.plan ?? "unknown"}`,
    );
  }
}
