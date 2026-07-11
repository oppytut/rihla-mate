import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCreateLicense = vi.fn();
const mockGetLicenseByKey = vi.fn();
const mockInvalidateLicenseCache = vi.fn();

vi.mock("@/lib/license/store", () => ({
  createLicense: mockCreateLicense,
  getLicenseByKey: mockGetLicenseByKey,
  invalidateLicenseCache: mockInvalidateLicenseCache,
  licenseKeys: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
}));

const {
  TRIAL_DURATION_DAYS,
  generateLicenseKey,
  startTrial,
  getTrialStatus,
  extendTrial,
  isTrialExpired,
} = await import("../license/trial");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockDb() {
  const db: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = [
    "select",
    "from",
    "where",
    "orderBy",
    "limit",
    "offset",
    "leftJoin",
    "insert",
    "values",
    "returning",
    "update",
    "set",
    "delete",
  ];
  for (const method of methods) {
    db[method] = vi.fn(() => db);
  }
  return db;
}

function makeLicense(overrides: Record<string, unknown> = {}) {
  return {
    id: "lic_trial_001",
    key: "RM-ABCD-1234-EFGH-5678",
    type: "trial" as const,
    seats: 1,
    issuedAt: new Date("2026-06-30"),
    expiresAt: new Date("2026-07-14"),
    revokedAt: null as Date | null,
    metadata: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TRIAL_DURATION_DAYS", () => {
  it("equals 14", () => {
    expect(TRIAL_DURATION_DAYS).toBe(14);
  });
});

describe("generateLicenseKey", () => {
  it("returns a string matching RM-XXXX-XXXX-XXXX-XXXX format", () => {
    const key = generateLicenseKey();
    expect(key).toMatch(/^RM-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
  });

  it("generates unique keys on each call", () => {
    const keys = new Set<string>();
    for (let i = 0; i < 50; i++) {
      keys.add(generateLicenseKey());
    }
    // All 50 should be unique
    expect(keys.size).toBe(50);
  });

  it("uses only uppercase hex characters", () => {
    const key = generateLicenseKey();
    const groups = key.slice(3).split("-");
    for (const group of groups) {
      expect(group).toMatch(/^[0-9A-F]{4}$/);
    }
  });

  it("has 4 groups of 4 characters after RM- prefix", () => {
    const key = generateLicenseKey();
    const parts = key.split("-");
    expect(parts).toHaveLength(5);
    expect(parts[0]).toBe("RM");
    for (let i = 1; i <= 4; i++) {
      expect(parts[i]).toHaveLength(4);
    }
  });
});

describe("startTrial", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  it("creates a trial license and returns the key", async () => {
    const expectedKey = "RM-AAAA-BBBB-CCCC-DDDD";
    // Mock generateLicenseKey indirectly — we just check the returned key
    mockCreateLicense.mockResolvedValueOnce({
      ...makeLicense(),
      key: expectedKey,
    });

    const result = await startTrial(db as never);

    expect(typeof result).toBe("string");
    expect(result).toMatch(/^RM-/);
  });

  it("passes trial type and 1 seat to createLicense", async () => {
    mockCreateLicense.mockResolvedValueOnce(makeLicense());

    await startTrial(db as never);

    const callArgs = mockCreateLicense.mock.calls[0];
    expect(callArgs[0]).toBe(db);
    expect(callArgs[1].type).toBe("trial");
    expect(callArgs[1].seats).toBe(1);
  });

  it("sets expiresAt to ~14 days from now", async () => {
    const before = new Date();
    mockCreateLicense.mockResolvedValueOnce(makeLicense());

    await startTrial(db as never);

    const callArgs = mockCreateLicense.mock.calls[0];
    const expiresAt = callArgs[1].expiresAt as Date;
    const diffDays = (expiresAt.getTime() - before.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(13);
    expect(diffDays).toBeLessThan(15);
  });

  it("invalidates the license cache", async () => {
    mockCreateLicense.mockResolvedValueOnce(makeLicense());

    await startTrial(db as never);

    expect(mockInvalidateLicenseCache).toHaveBeenCalledTimes(1);
  });

  it("passes metadata when provided", async () => {
    mockCreateLicense.mockResolvedValueOnce(makeLicense());
    const meta = { source: "test", version: 1 };

    await startTrial(db as never, meta);

    const callArgs = mockCreateLicense.mock.calls[0];
    expect(callArgs[1].metadata).toEqual(meta);
  });

  it("uses empty object as default metadata", async () => {
    mockCreateLicense.mockResolvedValueOnce(makeLicense());

    await startTrial(db as never);

    const callArgs = mockCreateLicense.mock.calls[0];
    expect(callArgs[1].metadata).toEqual({});
  });
});

describe("getTrialStatus", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  it("returns active trial with days left", async () => {
    const future = new Date();
    future.setDate(future.getDate() + 7); // 7 days from now
    mockGetLicenseByKey.mockResolvedValueOnce(makeLicense({ expiresAt: future }));

    const result = await getTrialStatus(db as never, "RM-KEY");

    expect(result.active).toBe(true);
    expect(result.daysLeft).toBeGreaterThanOrEqual(6);
    expect(result.daysLeft).toBeLessThanOrEqual(7);
    expect(result.isExpired).toBe(false);
    expect(result.expiresAt).toEqual(future);
  });

  it("returns inactive when expired", async () => {
    const past = new Date("2020-01-01");
    mockGetLicenseByKey.mockResolvedValueOnce(makeLicense({ expiresAt: past }));

    const result = await getTrialStatus(db as never, "RM-KEY");

    expect(result.active).toBe(false);
    expect(result.daysLeft).toBe(0);
    expect(result.isExpired).toBe(true);
  });

  it("returns inactive when revoked", async () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    mockGetLicenseByKey.mockResolvedValueOnce(
      makeLicense({ expiresAt: future, revokedAt: new Date("2026-06-29") }),
    );

    const result = await getTrialStatus(db as never, "RM-KEY");

    expect(result.active).toBe(false);
    expect(result.isExpired).toBe(false);
  });

  it("handles null expiresAt as epoch", async () => {
    mockGetLicenseByKey.mockResolvedValueOnce(makeLicense({ expiresAt: null }));

    const result = await getTrialStatus(db as never, "RM-KEY");

    expect(result.isExpired).toBe(true);
    expect(result.active).toBe(false);
  });

  it("throws when license not found", async () => {
    mockGetLicenseByKey.mockResolvedValueOnce(undefined);

    await expect(getTrialStatus(db as never, "RM-MISSING")).rejects.toThrow(
      'License key "RM-MISSING" not found',
    );
  });
});

describe("extendTrial", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  it("extends expiry by given days", async () => {
    const future = new Date();
    future.setDate(future.getDate() + 7);
    mockGetLicenseByKey
      .mockResolvedValueOnce(makeLicense({ expiresAt: new Date(future) })) // extendTrial lookup
      .mockResolvedValueOnce(makeLicense({ expiresAt: new Date(future.getTime() + 3 * 86400000) })); // getTrialStatus lookup

    const result = await extendTrial(db as never, "RM-KEY", 3);

    expect(result.daysLeft).toBeGreaterThanOrEqual(9);
  });

  it("throws when license not found", async () => {
    mockGetLicenseByKey.mockResolvedValueOnce(undefined);

    await expect(extendTrial(db as never, "RM-MISSING", 5)).rejects.toThrow(
      'License key "RM-MISSING" not found',
    );
  });

  it("extends from now when already expired", async () => {
    const past = new Date("2020-01-01");
    mockGetLicenseByKey
      .mockResolvedValueOnce(makeLicense({ expiresAt: past }))
      .mockResolvedValueOnce(makeLicense({ expiresAt: new Date(Date.now() + 5 * 86400000) }));

    const result = await extendTrial(db as never, "RM-KEY", 5);

    expect(result.daysLeft).toBeGreaterThanOrEqual(4);
    expect(result.daysLeft).toBeLessThanOrEqual(5);
    expect(result.isExpired).toBe(false);
  });
});

describe("isTrialExpired", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  it("returns true for expired trial", async () => {
    const past = new Date("2020-01-01");
    mockGetLicenseByKey.mockResolvedValueOnce(makeLicense({ expiresAt: past }));

    const result = await isTrialExpired(db as never, "RM-KEY");
    expect(result).toBe(true);
  });

  it("returns false for active trial", async () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    mockGetLicenseByKey.mockResolvedValueOnce(makeLicense({ expiresAt: future }));

    const result = await isTrialExpired(db as never, "RM-KEY");
    expect(result).toBe(false);
  });

  it("throws when license not found", async () => {
    mockGetLicenseByKey.mockResolvedValueOnce(undefined);

    await expect(isTrialExpired(db as never, "RM-MISSING")).rejects.toThrow(
      'License key "RM-MISSING" not found',
    );
  });
});
