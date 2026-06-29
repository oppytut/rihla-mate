import { createLicense, getLicenseByKey, invalidateLicenseCache } from "@/lib/license/store";
import type { db as DrizzleDb } from "@/lib/db/client";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of days a trial license is valid for. */
export const TRIAL_DURATION_DAYS = 14;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Status information for a trial license. */
export type LicenseTrialStatus = {
  /** Whether the trial license is currently active (not expired and not revoked). */
  active: boolean;
  /** Number of full days remaining before expiry. 0 when expired. */
  daysLeft: number;
  /** The date/time the trial expires. */
  expiresAt: Date;
  /** Whether the trial has passed its expiry date. */
  isExpired: boolean;
};

// ---------------------------------------------------------------------------
// Key generation
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically random license key.
 *
 * The key format is `RM-XXXX-XXXX-XXXX-XXXX` where each group is 4 uppercase
 * hexadecimal characters sourced from `crypto.getRandomValues()`.
 *
 * @returns A formatted license key string.
 */
export function generateLicenseKey(): string {
  const chars = "0123456789ABCDEF";
  const groups: string[] = [];

  for (let g = 0; g < 4; g++) {
    const bytes = new Uint8Array(4);
    crypto.getRandomValues(bytes);
    let group = "";
    for (let i = 0; i < 4; i++) {
      group += chars[bytes[i] % 16];
    }
    groups.push(group);
  }

  return `RM-${groups.join("-")}`;
}

// ---------------------------------------------------------------------------
// Trial helpers
// ---------------------------------------------------------------------------

function computeTrialExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + TRIAL_DURATION_DAYS);
  return expiry;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start a new trial license.
 *
 * Creates a license key of type `"trial"` that expires in
 * {@link TRIAL_DURATION_DAYS} days. An optional `metadata` object can be
 * stored alongside the license row.
 *
 * @param db      The Drizzle database instance.
 * @param metadata Optional JSON-serialisable metadata to attach to the license.
 * @returns The generated license key string.
 */
export async function startTrial(
  db: typeof DrizzleDb,
  metadata?: Record<string, unknown>,
): Promise<string> {
  const key = generateLicenseKey();
  const expiresAt = computeTrialExpiry();

  await createLicense(db, {
    key,
    type: "trial",
    seats: 1,
    expiresAt,
    metadata: metadata ?? {},
  });

  invalidateLicenseCache();

  return key;
}

/**
 * Retrieve the current status of a trial license.
 *
 * @param db         The Drizzle database instance.
 * @param licenseKey The license key string to look up.
 * @returns A {@link LicenseTrialStatus} object describing the trial state.
 * @throws When no license with the given key exists.
 */
export async function getTrialStatus(
  db: typeof DrizzleDb,
  licenseKey: string,
): Promise<LicenseTrialStatus> {
  const license = await getLicenseByKey(db, licenseKey);

  if (!license) {
    throw new Error(`License key "${licenseKey}" not found`);
  }

  const now = Date.now();
  const expiresAt = license.expiresAt ? new Date(license.expiresAt) : new Date(0);
  const isExpired = now >= expiresAt.getTime();

  let daysLeft: number;
  let active: boolean;

  if (isExpired) {
    daysLeft = 0;
    active = false;
  } else {
    daysLeft = Math.ceil((expiresAt.getTime() - now) / (1000 * 60 * 60 * 24));
    active = license.revokedAt === null;
  }

  return { active, daysLeft, expiresAt, isExpired };
}

/**
 * Extend a trial license by a given number of days.
 *
 * Adds `additionalDays` to the current expiry date. If the trial has already
 * expired the new expiry is calculated from *now* rather than the original
 * expiry, so the extension is always a full `additionalDays` going forward.
 *
 * @param db             The Drizzle database instance.
 * @param licenseKey     The license key string.
 * @param additionalDays Number of days to add (must be positive).
 * @returns The updated {@link LicenseTrialStatus}.
 * @throws When no license with the given key exists.
 */
export async function extendTrial(
  db: typeof DrizzleDb,
  licenseKey: string,
  additionalDays: number,
): Promise<LicenseTrialStatus> {
  const license = await getLicenseByKey(db, licenseKey);

  if (!license) {
    throw new Error(`License key "${licenseKey}" not found`);
  }

  const now = Date.now();
  const currentExpiry = license.expiresAt ? new Date(license.expiresAt).getTime() : now;

  const base = Math.max(currentExpiry, now);
  const newExpiry = new Date(base + additionalDays * 24 * 60 * 60 * 1000);

  const { eq } = await import("drizzle-orm");
  const { licenseKeys } = await import("@/lib/license/store");
  await db.update(licenseKeys).set({ expiresAt: newExpiry }).where(eq(licenseKeys.key, licenseKey));

  return getTrialStatus(db, licenseKey);
}

/**
 * Check whether a trial license has expired.
 *
 * This is a convenience wrapper that only returns the boolean expiry state
 * without the full status object.
 *
 * @param db         The Drizzle database instance.
 * @param licenseKey The license key string to check.
 * @returns `true` when the trial is expired, `false` otherwise.
 * @throws When no license with the given key exists.
 */
export async function isTrialExpired(db: typeof DrizzleDb, licenseKey: string): Promise<boolean> {
  const status = await getTrialStatus(db, licenseKey);
  return status.isExpired;
}
