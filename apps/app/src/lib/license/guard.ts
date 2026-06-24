import { TRPCError } from "@trpc/server";
import type { AnyMiddlewareFunction } from "@trpc/server";
import type { TRPCContext } from "@/lib/trpc/context";
import { db } from "@/lib/db/client";
import { isLicenseValid, getLicenseByKey } from "@/lib/license/store";
import {
  type LicenseFeature,
  type LicensePlan,
  PLAN_FEATURES,
} from "@rihla-mate/shared";

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

/**
 * tRPC middleware factory that requires a specific feature to be available
 * under the current license.
 *
 * Must be used **after** {@link licenseMiddleware} so that `ctx.license` is
 * already populated.
 *
 * @param feature - The {@link LicenseFeature} to check for.
 * @returns A tRPC middleware that throws `TRPCError` with code `FORBIDDEN` if
 *          the feature is not included in the current license plan.
 *
 * @throws TRPCError FORBIDDEN if `ctx.license` is `null` or the feature is not
 *         part of the license's plan features.
 *
 * Usage: `publicProcedure.use(licenseMiddleware).use(requireFeature("seo"))`
 */
export function requireFeature(
  feature: LicenseFeature,
): AnyMiddlewareFunction {
  return async ({ ctx, next }) => {
    if (!ctx.license) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "A valid license is required",
      });
    }

    const plan = ctx.license.type as LicensePlan;
    const features = PLAN_FEATURES[plan];

    if (!features || !features.includes(feature)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Feature "${feature}" is not available on your current license plan`,
      });
    }

    return next({ ctx });
  };
}

/**
 * Check whether a specific feature is available for a given license plan.
 *
 * This is a pure (synchronous) lookup function — it does not hit the database.
 * Callers are responsible for knowing the current license plan (e.g. from
 * context, session, or database query) and passing it in.
 *
 * @param feature - The {@link LicenseFeature} to check.
 * @param plan - The {@link LicensePlan} to check against.
 * @returns `true` if the feature is included in the plan, `false` otherwise.
 *
 * @example
 * ```ts
 * if (checkAccess("analytics", "pro")) {
 *   // show analytics panel
 * }
 * ```
 */
export function checkAccess(
  feature: LicenseFeature,
  plan: LicensePlan,
): boolean {
  const features = PLAN_FEATURES[plan];
  return features ? features.includes(feature) : false;
}
