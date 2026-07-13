import { db as defaultDb } from "@/lib/db/client";
import {
  getLicenseByKey,
  createLicense,
  invalidateLicenseCache,
  licenseKeys,
} from "@/lib/license/store";
import type { LicenseKey } from "@/lib/license/store";
import type { LicensePlan } from "@rihla-mate/shared";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { env } from "@/env";
import { logger } from "@/lib/utils/logger";
import { getScheduler } from "@/lib/background";

const validateResponseSchema = z.object({
  valid: z.boolean(),
  reason: z.string().optional(),
  expiresAt: z.string().optional(),
  seats: z.number().optional(),
  plan: z.string().optional(),
});

export interface LicenseCheckInResult {
  valid: boolean;
  reason?: string;
  expiresAt?: Date;
  seats?: number;
  plan?: string;
}

interface ValidateResponse {
  valid: boolean;
  reason?: string;
  expiresAt?: string;
  seats?: number;
  plan?: string;
}

/** Reads the license server base URL from environment, defaulting to localhost:4000. */
export function getLicenseServerUrl(): string {
  return env.LICENSE_SERVER_URL;
}

/**
 * Calls `GET /api/validate/:key` on the license server.
 * Returns `{ valid: false, reason: "NETWORK_ERROR" }` on fetch failure.
 * Returns `{ valid: false, reason: "INVALID_LICENSE" }` on non-2xx responses.
 */
export async function verifyLicenseWithServer(licenseKey: string): Promise<ValidateResponse> {
  const serverUrl = getLicenseServerUrl();
  const url = `${serverUrl}/api/validate/${encodeURIComponent(licenseKey)}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    logger.error("Network error during license validation", { component: "checkin" }, err);
    return { valid: false, reason: "NETWORK_ERROR" };
  }

  if (!response.ok) {
    return { valid: false, reason: "INVALID_LICENSE" };
  }

  const body: unknown = await response.json();
  return validateResponseSchema.parse(body);
}

/**
 * Refreshes the local license record with data from the server.
 * Creates a new record if the key does not exist locally.
 */
export async function updateLocalLicense(
  db: typeof defaultDb,
  licenseKey: string,
  serverResponse: ValidateResponse,
): Promise<LicenseKey | undefined> {
  if (!serverResponse.valid) {
    return undefined;
  }

  const existing = await getLicenseByKey(db, licenseKey);

  if (existing) {
    await db.delete(licenseKeys).where(eq(licenseKeys.key, licenseKey));
  }

  const created = await createLicense(db, {
    key: licenseKey,
    type: (serverResponse.plan as LicensePlan | undefined) ?? "pro",
    seats: serverResponse.seats ?? 1,
    expiresAt: serverResponse.expiresAt ? new Date(serverResponse.expiresAt) : undefined,
    metadata: {
      lastCheckinAt: new Date().toISOString(),
    },
  });

  invalidateLicenseCache(licenseKey);

  return created;
}

/**
 * Orchestrates a full license check-in:
 * 1. Verifies the license with the remote server.
 * 2. Updates the local database on success.
 * 3. Returns a structured result with validity, expiration, and seat count.
 */
export async function checkIn(
  db: typeof defaultDb,
  licenseKey: string,
): Promise<LicenseCheckInResult> {
  const serverResponse = await verifyLicenseWithServer(licenseKey);

  if (!serverResponse.valid) {
    return {
      valid: false,
      reason: serverResponse.reason ?? "INVALID_LICENSE",
    };
  }

  await updateLocalLicense(db, licenseKey, serverResponse);

  return {
    valid: true,
    expiresAt: serverResponse.expiresAt ? new Date(serverResponse.expiresAt) : undefined,
    seats: serverResponse.seats,
    plan: serverResponse.plan,
  };
}

/**
 * Schedules periodic license check-ins using the deployment-appropriate scheduler.
 *
 * VPS: recursive setTimeout with exponential backoff (default: 24h).
 * Cloudflare: no-op stub — Cron Triggers handle scheduling via wrangler.jsonc.
 *
 * Returns a `stop` handle for cancellation.
 */
export function scheduleCheckIn(
  db: typeof defaultDb,
  licenseKey: string,
  intervalMs: number = 86_400_000,
): { stop: () => void } {
  const scheduler = getScheduler();
  return scheduler.schedule(async () => {
    try {
      await checkIn(db, licenseKey);
    } catch (err) {
      logger.error("Scheduled check-in failed", { component: "checkin" }, err);
    }
  }, intervalMs);
}
