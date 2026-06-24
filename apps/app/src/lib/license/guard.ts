import { TRPCError } from "@trpc/server";
import type { AnyMiddlewareFunction } from "@trpc/server";
import type { TRPCContext } from "@/lib/trpc/context";
import { db } from "@/lib/db/client";
import { isLicenseValid, getLicenseByKey } from "@/lib/license/store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Information about a resolved license, attached to tRPC context. */
export interface LicenseInfo {
  key: string;
  valid: boolean;
  type: string;
  seats: number;
}

/** Extended tRPC context that includes optional license information. */
export interface LicensedContext extends TRPCContext {
  license: LicenseInfo | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the license key from request headers.
 *
 * Looks for the `x-license-key` header (case-insensitive).
 *
 * @returns An object with `key` set to the header value, or `null` if absent.
 */
export function getLicenseFromHeaders(headers: Headers): { key: string | null } {
  const key = headers.get("x-license-key");
  return { key };
}

/**
 * Fully validate a license key found in request headers.
 *
 * 1. Extracts the key via {@link getLicenseFromHeaders}.
 * 2. If no key is present, returns `{ valid: false, license: null }`.
 * 3. Looks up the key in the database and checks validity.
 *
 * @returns An object with `valid` and the resolved `LicenseInfo` (or `null`).
 */
export async function validateRequestLicense(
  database: Parameters<typeof isLicenseValid>[0],
  headers: Headers,
): Promise<{ valid: boolean; license: LicenseInfo | null }> {
  const { key } = getLicenseFromHeaders(headers);

  if (!key) {
    return { valid: false, license: null };
  }

  const valid = await isLicenseValid(database, key);

  if (!valid) {
    return { valid: false, license: null };
  }

  const row = await getLicenseByKey(database, key);

  if (!row) {
    return { valid: false, license: null };
  }

  return {
    valid: true,
    license: {
      key: row.key,
      valid: true,
      type: row.type,
      seats: row.seats,
    },
  };
}

// ---------------------------------------------------------------------------
// tRPC middlewares
// ---------------------------------------------------------------------------

/**
 * tRPC middleware that reads the `x-license-key` header and attaches license
 * information to the request context.
 *
 * - If the header is missing, the request is allowed through with
 *   `ctx.license = null`.
 * - If the header is present but the key is invalid or expired, a
 *   `TRPCError` with code `FORBIDDEN` is thrown.
 * - If the key is valid, `ctx.license` is populated with {@link LicenseInfo}.
 *
 * Usage: `publicProcedure.use(licenseMiddleware)`
 */
export const licenseMiddleware: AnyMiddlewareFunction = async ({ ctx, next }) => {
  const { key } = getLicenseFromHeaders(ctx.headers);

  if (!key) {
    return next({ ctx: { ...ctx, license: null } });
  }

  const { valid, license } = await validateRequestLicense(db, ctx.headers);

  if (!valid || !license) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Invalid or expired license",
    });
  }

  return next({ ctx: { ...ctx, license } });
};

/**
 * tRPC middleware that requires **any** valid license.
 *
 * Must be used **after** {@link licenseMiddleware} so that `ctx.license` is
 * already populated.
 *
 * @throws TRPCError FORBIDDEN if `ctx.license` is `null`.
 *
 * Usage: `publicProcedure.use(licenseMiddleware).use(requireLicense)`
 */
export const requireLicense: AnyMiddlewareFunction = async ({ ctx, next }) => {
  if (!ctx.license) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "A valid license is required",
    });
  }

  return next({ ctx });
};

/**
 * tRPC middleware that requires a **Pro** or **Enterprise** license.
 *
 * Must be used **after** {@link licenseMiddleware} so that `ctx.license` is
 * already populated.
 *
 * @throws TRPCError FORBIDDEN if the license type is neither `"pro"` nor
 *         `"enterprise"`.
 *
 * Usage: `publicProcedure.use(licenseMiddleware).use(requireProLicense)`
 */
export const requireProLicense: AnyMiddlewareFunction = async ({ ctx, next }) => {
  if (
    !ctx.license ||
    (ctx.license.type !== "pro" && ctx.license.type !== "enterprise")
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "A Pro or Enterprise license is required",
    });
  }

  return next({ ctx });
};
