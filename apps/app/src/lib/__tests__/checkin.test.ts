import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetLicenseByKey = vi.fn();
const mockCreateLicense = vi.fn();
const mockInvalidateLicenseCache = vi.fn();

vi.mock("@/lib/license/store", () => ({
  getLicenseByKey: mockGetLicenseByKey,
  createLicense: mockCreateLicense,
  invalidateLicenseCache: mockInvalidateLicenseCache,
  licenseKeys: {},
}));

const mockLoggerError = vi.fn();
vi.mock("@/lib/utils/logger", () => ({
  logger: { error: mockLoggerError },
}));

const mockEnv = { LICENSE_SERVER_URL: "http://localhost:3001" };
vi.mock("@/env", () => ({ env: mockEnv }));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
}));

const {
  getLicenseServerUrl,
  verifyLicenseWithServer,
  updateLocalLicense,
  checkIn,
  scheduleCheckIn,
} = await import("../license/checkin");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockDb() {
  const db: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = [
    "select", "from", "where", "orderBy", "limit", "offset",
    "leftJoin", "insert", "values", "returning",
    "update", "set", "delete",
  ];
  for (const method of methods) {
    db[method] = vi.fn(() => db);
  }
  return db;
}

const validServerResponse = {
  valid: true,
  plan: "pro",
  seats: 5,
  expiresAt: "2027-01-01T00:00:00.000Z",
};

const sampleLicense = {
  id: "lic_001",
  key: "RM-PRO-ABCD-1234-5678",
  type: "pro" as const,
  seats: 5,
  issuedAt: new Date("2026-01-01"),
  expiresAt: new Date("2027-01-01"),
  revokedAt: null,
  metadata: {},
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getLicenseServerUrl", () => {
  it("returns env.LICENSE_SERVER_URL", () => {
    expect(getLicenseServerUrl()).toBe("http://localhost:3001");
  });

  it("returns updated value when env changes", () => {
    mockEnv.LICENSE_SERVER_URL = "https://license.example.com";
    expect(getLicenseServerUrl()).toBe("https://license.example.com");
    mockEnv.LICENSE_SERVER_URL = "http://localhost:3001";
  });
});

describe("verifyLicenseWithServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("returns valid response on successful fetch", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(validServerResponse),
    } as Response);

    const result = await verifyLicenseWithServer("RM-KEY");
    expect(result).toEqual(validServerResponse);
  });

  it("returns NETWORK_ERROR on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const result = await verifyLicenseWithServer("RM-KEY");
    expect(result).toEqual({ valid: false, reason: "NETWORK_ERROR" });
    expect(mockLoggerError).toHaveBeenCalledTimes(1);
  });

  it("returns INVALID_LICENSE on non-2xx response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    const result = await verifyLicenseWithServer("RM-KEY");
    expect(result).toEqual({ valid: false, reason: "INVALID_LICENSE" });
  });

  it("returns INVALID_LICENSE on 500 response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const result = await verifyLicenseWithServer("RM-KEY");
    expect(result).toEqual({ valid: false, reason: "INVALID_LICENSE" });
  });

  it("throws on malformed JSON from server", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ valid: "not-a-boolean" }),
    } as Response);

    await expect(verifyLicenseWithServer("RM-KEY")).rejects.toThrow();
  });
});

describe("updateLocalLicense", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  it("returns undefined when serverResponse is invalid", async () => {
    const result = await updateLocalLicense(
      db as never,
      "RM-KEY",
      { valid: false, reason: "INVALID_LICENSE" },
    );
    expect(result).toBeUndefined();
  });

  it("creates a new license when key does not exist locally", async () => {
    mockGetLicenseByKey.mockResolvedValueOnce(undefined);
    mockCreateLicense.mockResolvedValueOnce(sampleLicense);

    const result = await updateLocalLicense(
      db as never,
      "RM-PRO-ABCD-1234-5678",
      validServerResponse,
    );

    expect(result).toEqual(sampleLicense);
    expect(mockGetLicenseByKey).toHaveBeenCalledWith(db, "RM-PRO-ABCD-1234-5678");
    expect(mockCreateLicense).toHaveBeenCalledTimes(1);
    expect(mockInvalidateLicenseCache).toHaveBeenCalledWith("RM-PRO-ABCD-1234-5678");
  });

  it("deletes existing and recreates when key already exists", async () => {
    mockGetLicenseByKey.mockResolvedValueOnce(sampleLicense);
    mockCreateLicense.mockResolvedValueOnce(sampleLicense);

    vi.mocked(db.delete).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);

    const result = await updateLocalLicense(
      db as never,
      "RM-PRO-ABCD-1234-5678",
      validServerResponse,
    );

    expect(result).toEqual(sampleLicense);
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(mockCreateLicense).toHaveBeenCalledTimes(1);
  });

  it("defaults plan to 'pro' when not provided", async () => {
    mockGetLicenseByKey.mockResolvedValueOnce(undefined);
    mockCreateLicense.mockResolvedValueOnce({ ...sampleLicense, type: "pro" });

    await updateLocalLicense(db as never, "RM-KEY", {
      valid: true,
      seats: 3,
    });

    const createCall = mockCreateLicense.mock.calls[0][1];
    expect(createCall.type).toBe("pro");
    expect(createCall.seats).toBe(3);
  });

  it("defaults seats to 1 when not provided", async () => {
    mockGetLicenseByKey.mockResolvedValueOnce(undefined);
    mockCreateLicense.mockResolvedValueOnce({ ...sampleLicense, seats: 1 });

    await updateLocalLicense(db as never, "RM-KEY", {
      valid: true,
    });

    const createCall = mockCreateLicense.mock.calls[0][1];
    expect(createCall.seats).toBe(1);
  });

  it("passes metadata with lastCheckinAt", async () => {
    mockGetLicenseByKey.mockResolvedValueOnce(undefined);
    mockCreateLicense.mockResolvedValueOnce(sampleLicense);

    await updateLocalLicense(db as never, "RM-KEY", validServerResponse);

    const createCall = mockCreateLicense.mock.calls[0][1];
    expect(createCall.metadata).toHaveProperty("lastCheckinAt");
  });
});

describe("checkIn", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  it("returns invalid when server says invalid", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    const result = await checkIn(db as never, "RM-KEY");
    expect(result).toEqual({
      valid: false,
      reason: "INVALID_LICENSE",
    });
  });

  it("returns valid with full data on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(validServerResponse),
    } as Response);
    mockGetLicenseByKey.mockResolvedValueOnce(undefined);
    mockCreateLicense.mockResolvedValueOnce(sampleLicense);

    const result = await checkIn(db as never, "RM-KEY");

    expect(result.valid).toBe(true);
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.seats).toBe(5);
    expect(result.plan).toBe("pro");
  });

  it("returns invalid with NETWORK_ERROR reason on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("ENOTFOUND"));

    const result = await checkIn(db as never, "RM-KEY");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("NETWORK_ERROR");
  });

  it("handles undefined expiresAt from server", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ valid: true, seats: 2 }),
    } as Response);
    mockGetLicenseByKey.mockResolvedValueOnce(undefined);
    mockCreateLicense.mockResolvedValueOnce(sampleLicense);

    const result = await checkIn(db as never, "RM-KEY");

    expect(result.valid).toBe(true);
    expect(result.expiresAt).toBeUndefined();
  });
});

describe("scheduleCheckIn", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    db = mockDb();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a stop function", () => {
    const { stop } = scheduleCheckIn(db as never, "RM-KEY");
    expect(typeof stop).toBe("function");
  });

  it("calls checkIn after the interval", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(validServerResponse),
    } as Response);
    mockGetLicenseByKey.mockResolvedValue(undefined);
    mockCreateLicense.mockResolvedValue(sampleLicense);

    scheduleCheckIn(db as never, "RM-KEY", 1000);

    // Should not have called yet
    expect(fetchSpy).not.toHaveBeenCalled();

    // Advance timer past interval
    await vi.advanceTimersByTimeAsync(1100);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("stop prevents further calls", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(validServerResponse),
    } as Response);
    mockGetLicenseByKey.mockResolvedValue(undefined);
    mockCreateLicense.mockResolvedValue(sampleLicense);

    const { stop } = scheduleCheckIn(db as never, "RM-KEY", 1000);
    stop();

    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses exponential backoff on failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("fail"));
    mockGetLicenseByKey.mockResolvedValue(undefined);
    mockCreateLicense.mockResolvedValue(sampleLicense);

    scheduleCheckIn(db as never, "RM-KEY", 1000);

    // First call fails
    await vi.advanceTimersByTimeAsync(1100);
    expect(mockLoggerError).toHaveBeenCalled();

    // Backoff doubles delay to 2000, but capped at intervalMs (1000)
    // So next call fires after another 1000ms
    await vi.advanceTimersByTimeAsync(1100);
    expect(mockLoggerError).toHaveBeenCalledTimes(2);
  });
});
