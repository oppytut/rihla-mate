import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ---------------------------------------------------------------------------
// Mocks for license/store functions
// ---------------------------------------------------------------------------

const { mockIsLicenseValid, mockGetLicenseByKey } = vi.hoisted(() => ({
  mockIsLicenseValid: vi.fn(),
  mockGetLicenseByKey: vi.fn(),
}));

vi.mock("../license/store", () => ({
  isLicenseValid: mockIsLicenseValid,
  getLicenseByKey: mockGetLicenseByKey,
}));

// ---------------------------------------------------------------------------
// Mock the db client
// ---------------------------------------------------------------------------

vi.mock("../db/client", () => ({
  db: {},
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import {
  getLicenseFromHeaders,
  validateRequestLicense,
  licenseMiddleware,
  requireLicense,
  requireProLicense,
  requireFeature,
  checkAccess,
} from "../license/guard";

import type { LicenseInfo } from "../license/guard";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal mock "next" callback that tRPC middlewares call. */
function mockNext() {
  return vi.fn(async (opts: { ctx: Record<string, unknown> }) => {
    return opts.ctx;
  });
}

/** Build a minimal mock inner context (the `ctx` inside `{ ctx, next }`). */
function makeInnerCtx(overrides?: { headers?: Headers; license?: LicenseInfo | null }) {
  return {
    headers: overrides?.headers ?? new Headers(),
    license: overrides?.license ?? null,
  };
}

/**
 * Wrap inner ctx + next into the shape tRPC middleware expects.
 *
 * tRPC v11 middlewares require a full opts object with type, path, input,
 * getRawInput, meta, signal, batchIndex.  At runtime the middleware
 * functions only destructure `{ ctx, next }`, so casting `as any` avoids
 * needless ceremony in tests.
 */
function middlewareArgs(
  innerCtx: ReturnType<typeof makeInnerCtx>,
  next?: ReturnType<typeof mockNext>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  return {
    ctx: innerCtx,
    next: next ?? mockNext(),
  };
}

// ---------------------------------------------------------------------------
// getLicenseFromHeaders
// ---------------------------------------------------------------------------

describe("getLicenseFromHeaders", () => {
  it("returns the license key when x-license-key header is present", () => {
    const headers = new Headers();
    headers.set("x-license-key", "RM-TEST-KEY-1234");

    const result = getLicenseFromHeaders(headers);
    expect(result).toEqual({ key: "RM-TEST-KEY-1234" });
  });

  it("returns null key when header is missing", () => {
    const headers = new Headers();

    const result = getLicenseFromHeaders(headers);
    expect(result).toEqual({ key: null });
  });

  it("is case-insensitive per HTTP spec (Headers.get is case-insensitive)", () => {
    const headers = new Headers();
    headers.set("X-License-Key", "RM-TEST-KEY-9999");

    const result = getLicenseFromHeaders(headers);
    expect(result).toEqual({ key: "RM-TEST-KEY-9999" });
  });

  it("returns empty string if header is set to empty string", () => {
    const headers = new Headers();
    headers.set("x-license-key", "");

    const result = getLicenseFromHeaders(headers);
    expect(result).toEqual({ key: "" });
  });
});

// ---------------------------------------------------------------------------
// validateRequestLicense
// ---------------------------------------------------------------------------

describe("validateRequestLicense", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDb = {} as Parameters<typeof validateRequestLicense>[0];

  it("returns { valid: false, license: null } when no header is present", async () => {
    const headers = new Headers();

    const result = await validateRequestLicense(mockDb, headers);

    expect(result).toEqual({ valid: false, license: null });
    expect(mockIsLicenseValid).not.toHaveBeenCalled();
  });

  it("returns { valid: false, license: null } when header is empty string", async () => {
    const headers = new Headers();
    headers.set("x-license-key", "");

    const result = await validateRequestLicense(mockDb, headers);

    expect(result).toEqual({ valid: false, license: null });
    expect(mockIsLicenseValid).not.toHaveBeenCalled();
  });

  it("returns { valid: false, license: null } when isLicenseValid returns false", async () => {
    const headers = new Headers();
    headers.set("x-license-key", "RM-INVALID-KEY");
    mockIsLicenseValid.mockResolvedValue(false);

    const result = await validateRequestLicense(mockDb, headers);

    expect(result).toEqual({ valid: false, license: null });
    expect(mockIsLicenseValid).toHaveBeenCalledWith(mockDb, "RM-INVALID-KEY");
    expect(mockGetLicenseByKey).not.toHaveBeenCalled();
  });

  it("returns { valid: false, license: null } when key is valid but getLicenseByKey returns undefined", async () => {
    const headers = new Headers();
    headers.set("x-license-key", "RM-GHOST-KEY");
    mockIsLicenseValid.mockResolvedValue(true);
    mockGetLicenseByKey.mockResolvedValue(undefined);

    const result = await validateRequestLicense(mockDb, headers);

    expect(result).toEqual({ valid: false, license: null });
    expect(mockGetLicenseByKey).toHaveBeenCalledWith(mockDb, "RM-GHOST-KEY");
  });

  it("returns valid license info for a valid pro license", async () => {
    const headers = new Headers();
    headers.set("x-license-key", "RM-PRO-KEY");
    mockIsLicenseValid.mockResolvedValue(true);
    mockGetLicenseByKey.mockResolvedValue({
      key: "RM-PRO-KEY",
      type: "pro",
      seats: 5,
    });

    const result = await validateRequestLicense(mockDb, headers);

    expect(result).toEqual({
      valid: true,
      license: {
        key: "RM-PRO-KEY",
        valid: true,
        type: "pro",
        seats: 5,
      },
    });
  });

  it("returns valid license info for an enterprise license", async () => {
    const headers = new Headers();
    headers.set("x-license-key", "RM-ENT-KEY");
    mockIsLicenseValid.mockResolvedValue(true);
    mockGetLicenseByKey.mockResolvedValue({
      key: "RM-ENT-KEY",
      type: "enterprise",
      seats: 50,
    });

    const result = await validateRequestLicense(mockDb, headers);

    expect(result).toEqual({
      valid: true,
      license: {
        key: "RM-ENT-KEY",
        valid: true,
        type: "enterprise",
        seats: 50,
      },
    });
  });

  it("returns valid license info for a trial license", async () => {
    const headers = new Headers();
    headers.set("x-license-key", "RM-TRIAL-KEY");
    mockIsLicenseValid.mockResolvedValue(true);
    mockGetLicenseByKey.mockResolvedValue({
      key: "RM-TRIAL-KEY",
      type: "trial",
      seats: 1,
    });

    const result = await validateRequestLicense(mockDb, headers);

    expect(result).toEqual({
      valid: true,
      license: {
        key: "RM-TRIAL-KEY",
        valid: true,
        type: "trial",
        seats: 1,
      },
    });
  });
});

// ---------------------------------------------------------------------------
// licenseMiddleware
// ---------------------------------------------------------------------------

describe("licenseMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws FORBIDDEN when no license header is present", async () => {
    const innerCtx = makeInnerCtx();
    const args = middlewareArgs(innerCtx);

    await expect(licenseMiddleware(args)).rejects.toThrow(TRPCError);
    await expect(licenseMiddleware(args)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Invalid or expired license",
    });
  });

  it("throws FORBIDDEN when license is invalid", async () => {
    const headers = new Headers();
    headers.set("x-license-key", "RM-BAD-KEY");
    mockIsLicenseValid.mockResolvedValue(false);

    const innerCtx = makeInnerCtx({ headers });
    const args = middlewareArgs(innerCtx);

    await expect(licenseMiddleware(args)).rejects.toThrow(TRPCError);
    await expect(licenseMiddleware(args)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Invalid or expired license",
    });
  });

  it("calls next with license in ctx when key is valid", async () => {
    const headers = new Headers();
    headers.set("x-license-key", "RM-VALID-KEY");
    mockIsLicenseValid.mockResolvedValue(true);
    mockGetLicenseByKey.mockResolvedValue({
      key: "RM-VALID-KEY",
      type: "pro",
      seats: 10,
    });

    const nextFn = mockNext();
    const innerCtx = makeInnerCtx({ headers });
    const args = middlewareArgs(innerCtx, nextFn);

    await licenseMiddleware(args);

    expect(nextFn).toHaveBeenCalledTimes(1);

    const calledCtx = nextFn.mock.calls[0]?.[0].ctx;
    if (!calledCtx) throw new Error("Expected nextFn to be called");
    expect(calledCtx.license).toEqual({
      key: "RM-VALID-KEY",
      valid: true,
      type: "pro",
      seats: 10,
    });
  });
});

// ---------------------------------------------------------------------------
// requireLicense
// ---------------------------------------------------------------------------

describe("requireLicense", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws FORBIDDEN when ctx.license is null", async () => {
    const innerCtx = makeInnerCtx({ license: null });
    const args = middlewareArgs(innerCtx);

    await expect(requireLicense(args)).rejects.toThrow(TRPCError);
    await expect(requireLicense(args)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "A valid license is required",
    });
  });

  it("calls next when ctx.license is present", async () => {
    const nextFn = mockNext();
    const license: LicenseInfo = {
      key: "RM-KEY",
      valid: true,
      type: "pro",
      seats: 3,
    };
    const innerCtx = makeInnerCtx({ license });
    const args = middlewareArgs(innerCtx, nextFn);

    await requireLicense(args);

    expect(nextFn).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// requireProLicense
// ---------------------------------------------------------------------------

describe("requireProLicense", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws FORBIDDEN when ctx.license is null", async () => {
    const innerCtx = makeInnerCtx({ license: null });
    const args = middlewareArgs(innerCtx);

    await expect(requireProLicense(args)).rejects.toThrow(TRPCError);
    await expect(requireProLicense(args)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "A Pro or Enterprise license is required",
    });
  });

  it("throws FORBIDDEN for a starter license", async () => {
    const license: LicenseInfo = {
      key: "RM-STARTER",
      valid: true,
      type: "starter",
      seats: 1,
    };
    const innerCtx = makeInnerCtx({ license });
    const args = middlewareArgs(innerCtx);

    await expect(requireProLicense(args)).rejects.toThrow(TRPCError);
    await expect(requireProLicense(args)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "A Pro or Enterprise license is required",
    });
  });

  it("throws FORBIDDEN for a trial license (mapped to starter)", async () => {
    const license: LicenseInfo = {
      key: "RM-TRIAL",
      valid: true,
      type: "trial",
      seats: 1,
    };
    const innerCtx = makeInnerCtx({ license });
    const args = middlewareArgs(innerCtx);

    await expect(requireProLicense(args)).rejects.toThrow(TRPCError);
    await expect(requireProLicense(args)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "A Pro or Enterprise license is required",
    });
  });

  it("calls next for a pro license", async () => {
    const nextFn = mockNext();
    const license: LicenseInfo = {
      key: "RM-PRO",
      valid: true,
      type: "pro",
      seats: 5,
    };
    const innerCtx = makeInnerCtx({ license });
    const args = middlewareArgs(innerCtx, nextFn);

    await requireProLicense(args);

    expect(nextFn).toHaveBeenCalledTimes(1);
  });

  it("calls next for an enterprise license", async () => {
    const nextFn = mockNext();
    const license: LicenseInfo = {
      key: "RM-ENT",
      valid: true,
      type: "enterprise",
      seats: 100,
    };
    const innerCtx = makeInnerCtx({ license });
    const args = middlewareArgs(innerCtx, nextFn);

    await requireProLicense(args);

    expect(nextFn).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// requireFeature
// ---------------------------------------------------------------------------

describe("requireFeature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws FORBIDDEN when ctx.license is null", async () => {
    const innerCtx = makeInnerCtx({ license: null });
    const args = middlewareArgs(innerCtx);
    const middleware = requireFeature("seo");

    await expect(middleware(args)).rejects.toThrow(TRPCError);
    await expect(middleware(args)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "A valid license is required",
    });
  });

  it("throws FORBIDDEN when feature is not available on the plan", async () => {
    const license: LicenseInfo = {
      key: "RM-STARTER",
      valid: true,
      type: "starter",
      seats: 1,
    };
    const innerCtx = makeInnerCtx({ license });
    const args = middlewareArgs(innerCtx);
    const middleware = requireFeature("analytics");

    await expect(middleware(args)).rejects.toThrow(TRPCError);
    await expect(middleware(args)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: 'Feature "analytics" is not available on your current license plan',
    });
  });

  it("maps trial to starter for feature checking", async () => {
    const license: LicenseInfo = {
      key: "RM-TRIAL",
      valid: true,
      type: "trial",
      seats: 1,
    };
    const nextFn = mockNext();
    const innerCtx = makeInnerCtx({ license });
    const args = middlewareArgs(innerCtx, nextFn);
    const middleware = requireFeature("booking_engine");

    await middleware(args);
    expect(nextFn).toHaveBeenCalledTimes(1);
  });

  it("calls next when feature is available on pro plan", async () => {
    const nextFn = mockNext();
    const license: LicenseInfo = {
      key: "RM-PRO",
      valid: true,
      type: "pro",
      seats: 5,
    };
    const innerCtx = makeInnerCtx({ license });
    const args = middlewareArgs(innerCtx, nextFn);
    const middleware = requireFeature("multi_tenant");

    await middleware(args);

    expect(nextFn).toHaveBeenCalledTimes(1);
  });

  it("calls next when feature is available on enterprise plan", async () => {
    const nextFn = mockNext();
    const license: LicenseInfo = {
      key: "RM-ENT",
      valid: true,
      type: "enterprise",
      seats: 100,
    };
    const innerCtx = makeInnerCtx({ license });
    const args = middlewareArgs(innerCtx, nextFn);
    const middleware = requireFeature("priority_support");

    await middleware(args);

    expect(nextFn).toHaveBeenCalledTimes(1);
  });

  it("throws for enterprise-only feature on pro plan", async () => {
    const license: LicenseInfo = {
      key: "RM-PRO",
      valid: true,
      type: "pro",
      seats: 5,
    };
    const innerCtx = makeInnerCtx({ license });
    const args = middlewareArgs(innerCtx);
    const middleware = requireFeature("priority_support");

    await expect(middleware(args)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: 'Feature "priority_support" is not available on your current license plan',
    });
  });

  it("throws for unknown feature name", async () => {
    const license: LicenseInfo = {
      key: "RM-PRO",
      valid: true,
      type: "pro",
      seats: 5,
    };
    const innerCtx = makeInnerCtx({ license });
    const args = middlewareArgs(innerCtx);
    const middleware = requireFeature("nonexistent" as never);

    await expect(middleware(args)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});

// ---------------------------------------------------------------------------
// checkAccess
// ---------------------------------------------------------------------------

describe("checkAccess", () => {
  it("returns true for a feature available on the plan", () => {
    expect(checkAccess("booking_engine", "starter")).toBe(true);
    expect(checkAccess("seo", "pro")).toBe(true);
    expect(checkAccess("multi_tenant", "pro")).toBe(true);
    expect(checkAccess("priority_support", "enterprise")).toBe(true);
  });

  it("returns false for a feature not available on the plan", () => {
    expect(checkAccess("analytics", "starter")).toBe(false);
    expect(checkAccess("api_access", "pro")).toBe(false);
    expect(checkAccess("template_marketplace", "starter")).toBe(false);
  });

  it("starter plan features", () => {
    expect(checkAccess("custom_domain", "starter")).toBe(true);
    expect(checkAccess("white_label", "starter")).toBe(true);
    expect(checkAccess("booking_engine", "starter")).toBe(true);
    expect(checkAccess("seo", "starter")).toBe(false);
    expect(checkAccess("payment_gateway", "starter")).toBe(false);
  });

  it("pro plan features", () => {
    expect(checkAccess("custom_domain", "pro")).toBe(true);
    expect(checkAccess("white_label", "pro")).toBe(true);
    expect(checkAccess("seo", "pro")).toBe(true);
    expect(checkAccess("analytics", "pro")).toBe(true);
    expect(checkAccess("booking_engine", "pro")).toBe(true);
    expect(checkAccess("payment_gateway", "pro")).toBe(true);
    expect(checkAccess("multi_tenant", "pro")).toBe(true);
    expect(checkAccess("api_access", "pro")).toBe(false);
    expect(checkAccess("template_marketplace", "pro")).toBe(false);
    expect(checkAccess("priority_support", "pro")).toBe(false);
  });

  it("enterprise plan features", () => {
    expect(checkAccess("api_access", "enterprise")).toBe(true);
    expect(checkAccess("template_marketplace", "enterprise")).toBe(true);
    expect(checkAccess("priority_support", "enterprise")).toBe(true);
    expect(checkAccess("multi_tenant", "enterprise")).toBe(true);
    expect(checkAccess("booking_engine", "enterprise")).toBe(true);
  });

  it("returns false for all features when plan key is unknown (type-safety guard)", () => {
    expect(checkAccess("booking_engine", "nonexistent" as never)).toBe(false);
    expect(checkAccess("seo", "nonexistent" as never)).toBe(false);
  });
});
