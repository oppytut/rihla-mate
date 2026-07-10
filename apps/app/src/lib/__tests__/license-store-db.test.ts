import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  createLicense,
  getLicenseByKey,
  revokeLicense,
  isLicenseValid,
  getActiveLicenseCount,
  invalidateLicenseCache,
} = await import("../license/store");

function mockDb(): Record<string, ReturnType<typeof vi.fn>> {
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

const sampleLicense = {
  id: "00000000-0000-0000-0000-000000000001",
  key: "RM-PRO-ABCD-1234-5678",
  type: "pro" as const,
  seats: 5,
  issuedAt: new Date("2026-01-01"),
  expiresAt: new Date("2027-01-01"),
  revokedAt: null,
  metadata: {},
};

describe("createLicense", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  it("inserts a license and returns the created row", async () => {
    vi.mocked(db.insert).mockReturnValueOnce(db as never);
    vi.mocked(db.values).mockReturnValueOnce(db as never);
    vi.mocked(db.returning).mockResolvedValueOnce([sampleLicense] as never);

    const result = await createLicense(db as never, {
      key: "RM-PRO-ABCD-1234-5678",
      type: "pro",
      seats: 5,
    });

    expect(result).toEqual(sampleLicense);
    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(db.values).toHaveBeenCalledTimes(1);
    expect(db.returning).toHaveBeenCalledTimes(1);
  });

  it("works with trial license type", async () => {
    const trialLicense = {
      ...sampleLicense,
      type: "trial" as const,
      seats: 1,
    };

    vi.mocked(db.insert).mockReturnValueOnce(db as never);
    vi.mocked(db.values).mockReturnValueOnce(db as never);
    vi.mocked(db.returning).mockResolvedValueOnce([trialLicense] as never);

    const result = await createLicense(db as never, {
      key: "RM-TRIAL-ABCD",
      type: "trial",
      seats: 1,
    });

    expect(result.type).toBe("trial");
    expect(result.seats).toBe(1);
  });
});

describe("getLicenseByKey", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  it("returns the license row when found", async () => {
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([sampleLicense] as never);

    const result = await getLicenseByKey(db as never, "RM-PRO-ABCD-1234-5678");

    expect(result).toEqual(sampleLicense);
  });

  it("returns undefined when license not found", async () => {
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    const result = await getLicenseByKey(db as never, "RM-NONEXISTENT");

    expect(result).toBeUndefined();
  });

  it("returns the first match when multiple rows exist (shouldn't happen with unique key)", async () => {
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([sampleLicense] as never);

    const result = await getLicenseByKey(db as never, "RM-PRO-ABCD-1234-5678");

    expect(result).toBeDefined();
    if (!result) throw new Error("Expected result to be defined");

    expect(result.key).toBe("RM-PRO-ABCD-1234-5678");
  });
});

describe("revokeLicense", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  it("revokes the license and returns the updated row", async () => {
    const revokedLicense = {
      ...sampleLicense,
      revokedAt: new Date("2026-06-30"),
    };

    vi.mocked(db.update).mockReturnValueOnce(db as never);
    vi.mocked(db.set).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.returning).mockResolvedValueOnce([revokedLicense] as never);

    const result = await revokeLicense(db as never, "RM-PRO-ABCD-1234-5678");

    expect(result).toEqual(revokedLicense);
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.set).toHaveBeenCalledTimes(1);
  });

  it("returns undefined when license does not exist", async () => {
    vi.mocked(db.update).mockReturnValueOnce(db as never);
    vi.mocked(db.set).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.returning).mockResolvedValueOnce([] as never);

    const result = await revokeLicense(db as never, "RM-NONEXISTENT");

    expect(result).toBeUndefined();
  });
});

describe("isLicenseValid", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    invalidateLicenseCache();
    db = mockDb();
  });

  it("returns true for a valid, non-expired, non-revoked license", async () => {
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([{ id: sampleLicense.id }] as never);

    const result = await isLicenseValid(db as never, "RM-VALID-KEY");

    expect(result).toBe(true);
  });

  it("returns false when no matching license found", async () => {
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    const result = await isLicenseValid(db as never, "RM-NONEXISTENT");

    expect(result).toBe(false);
  });

  it("returns false for a revoked license", async () => {
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    const result = await isLicenseValid(db as never, "RM-REVOKED-KEY");

    expect(result).toBe(false);
  });

  it("caches the result and uses cache on second call", async () => {
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([{ id: sampleLicense.id }] as never);

    const first = await isLicenseValid(db as never, "RM-CACHED-KEY");
    expect(first).toBe(true);

    vi.clearAllMocks();

    const second = await isLicenseValid(db as never, "RM-CACHED-KEY");
    expect(second).toBe(true);
    expect(db.select).not.toHaveBeenCalled();
  });
});

describe("getActiveLicenseCount", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    invalidateLicenseCache();
    db = mockDb();
  });

  it("returns the count of active licenses", async () => {
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 42 }] as never);

    const result = await getActiveLicenseCount(db as never);

    expect(result).toBe(42);
  });

  it("returns 0 when no active licenses exist", async () => {
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 0 }] as never);

    const result = await getActiveLicenseCount(db as never);

    expect(result).toBe(0);
  });

  it("returns 0 when result is empty array", async () => {
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([] as never);

    const result = await getActiveLicenseCount(db as never);

    expect(result).toBe(0);
  });
});
