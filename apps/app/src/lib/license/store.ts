import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { pgTable, uuid, varchar, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { eq, and, isNull, or, gt, sql } from "drizzle-orm";
import type { LicensePlan } from "@rihla-mate/shared";

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000;

const licenseValidCache = new Map<string, CacheEntry<boolean>>();
let licenseCountCache: CacheEntry<number> | null = null;

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const licenseKeys = pgTable("license_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  type: varchar("type", { length: 50 }).notNull().$type<LicensePlan | "trial">(),
  seats: integer("seats").notNull().default(1),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  metadata: jsonb("metadata").notNull().default({}),
});

// ---------------------------------------------------------------------------
// Derived types
// ---------------------------------------------------------------------------

/** A single license-key row (selected / inserted). */
export type LicenseKey = typeof licenseKeys.$inferSelect;

/** The fields required to create a new license key. */
export type CreateLicenseInput = typeof licenseKeys.$inferInsert;

type Db = NodePgDatabase<Record<string, unknown>>;

// ---------------------------------------------------------------------------
// CRUD helpers
// ---------------------------------------------------------------------------

/**
 * Insert a new license key into the database.
 *
 * @returns The newly created license-key row.
 */
export async function createLicense(db: Db, data: CreateLicenseInput): Promise<LicenseKey> {
  const [row] = await db.insert(licenseKeys).values(data).returning();
  return row;
}

/**
 * Find a license key by its key string.
 *
 * @returns The matching row, or `undefined` when no row is found.
 */
export async function getLicenseByKey(db: Db, key: string): Promise<LicenseKey | undefined> {
  const rows = await db.select().from(licenseKeys).where(eq(licenseKeys.key, key)).limit(1);
  return rows[0];
}

/**
 * Revoke a license key by setting `revokedAt` to the current timestamp.
 *
 * @returns The updated row, or `undefined` when the key does not exist.
 */
export async function revokeLicense(db: Db, key: string): Promise<LicenseKey | undefined> {
  const [row] = await db
    .update(licenseKeys)
    .set({ revokedAt: sql`now()` })
    .where(eq(licenseKeys.key, key))
    .returning();
  return row;
}

/**
 * Check whether a license key is currently valid.
 *
 * A license is valid when:
 * - it exists,
 * - it has not been revoked, and
 * - it has not expired (or has no expiry).
 *
 * @returns `true` when the license is valid, `false` otherwise.
 */
export async function isLicenseValid(db: Db, key: string): Promise<boolean> {
  const cached = licenseValidCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.value;
  }

  const rows = await db
    .select({ id: licenseKeys.id })
    .from(licenseKeys)
    .where(
      and(
        eq(licenseKeys.key, key),
        isNull(licenseKeys.revokedAt),
        or(isNull(licenseKeys.expiresAt), gt(licenseKeys.expiresAt, sql`now()`)),
      ),
    )
    .limit(1);

  const result = rows.length > 0;
  licenseValidCache.set(key, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });

  return result;
}

/**
 * Count the number of active (non-revoked, non-expired) license keys.
 *
 * @returns The count of active licenses.
 */
export async function getActiveLicenseCount(db: Db): Promise<number> {
  if (licenseCountCache && Date.now() < licenseCountCache.expiresAt) {
    return licenseCountCache.value;
  }

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(licenseKeys)
    .where(
      and(
        isNull(licenseKeys.revokedAt),
        or(isNull(licenseKeys.expiresAt), gt(licenseKeys.expiresAt, sql`now()`)),
      ),
    );

  const count = result?.count ?? 0;
  licenseCountCache = { value: count, expiresAt: Date.now() + CACHE_TTL_MS };

  return count;
}
