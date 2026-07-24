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

const mockEnv = {
  LICENSE_SERVER_URL: "http://localhost:3001",
  LICENSE_API_KEY: "test-api-key",
  INSTANCE_ID: "test-instance",
};
vi.mock("@/env", () => ({ env: mockEnv }));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
}));

const {
  getLicenseServerUrl,
  decodeLicensePayload,
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

/** Build a minimal RML1 key with base64url JSON payload (no real signature). */
function makeRml1Key(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return `RML1.${b64}.fakesig`;
}

const samplePayload = {
  licenseId: "lic_bootstrap",
  customerId: "cus_bootstrap",
  customerName: "Bootstrap",
  plan: "pro",
  features: ["booking_engine"],
  maxTenants: 1,
  maxMonthlyBookings: 100,
  expiresAt: "2027-01-01T00:00:00.000Z",
  gracePeriodDays: 7,
  isTrial: false,
  trialDays: 0,
  apiUrl: "http://localhost:3001/api/v1",
};

const sampleRml1Key = makeRml1Key(samplePayload);

const activateOkBody = {
  success: true,
  license: {
    ...samplePayload,
    status: "active",
    activatedAt: "2026-01-01T00:00:00.000Z",
    domain: "",
  },
};

const checkinOkBody = {
  status: "ok" as const,
  plan: "pro",
  features: ["booking_engine"],
  expiresAt: "2027-01-01T00:00:00.000Z",
  graceRemaining: 0,
};

const sampleLicense = {
  id: "lic_001",
  key: sampleRml1Key,
  type: "pro" as const,
  seats: 1,
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

describe("decodeLicensePayload", () => {
  it("decodes RML1 payload", () => {
    const decoded = decodeLicensePayload(sampleRml1Key);
    expect(decoded?.licenseId).toBe("lic_bootstrap");
    expect(decoded?.plan).toBe("pro");
  });

  it("returns null for non-RML1 keys", () => {
    expect(decodeLicensePayload("not-a-key")).toBeNull();
  });
});

describe("verifyLicenseWithServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.LICENSE_API_KEY = "test-api-key";
  });

  it("check-in first for RML1 keys; returns valid on ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(checkinOkBody),
    } as Response);

    const result = await verifyLicenseWithServer(sampleRml1Key);
    expect(result.valid).toBe(true);
    expect(result.plan).toBe("pro");
    expect(result.licenseId).toBe("lic_bootstrap");

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/checkin");
    expect(init.method).toBe("POST");
  });

  it("falls back to activate when check-in says not activated", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: "Instance not activated for this license" }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(activateOkBody),
      } as Response);

    const result = await verifyLicenseWithServer(sampleRml1Key);
    expect(result.valid).toBe(true);
    expect(result.licenseId).toBe("lic_bootstrap");
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain("/api/v1/activate");
  });

  it("activates directly for non-RML1 keys", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(activateOkBody),
    } as Response);

    const result = await verifyLicenseWithServer("plain-key");
    expect(result.valid).toBe(true);
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain("/api/v1/activate");
  });

  it("returns NETWORK_ERROR on fetch failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const result = await verifyLicenseWithServer(sampleRml1Key);
    expect(result).toEqual({ valid: false, reason: "NETWORK_ERROR" });
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it("returns INVALID_LICENSE on non-2xx activate for plain key", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "not found", code: "LICENSE_NOT_FOUND" }),
    } as Response);

    const result = await verifyLicenseWithServer("plain-key");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("LICENSE_NOT_FOUND");
  });

  it("returns MISSING_API_KEY when LICENSE_API_KEY unset", async () => {
    mockEnv.LICENSE_API_KEY = "";
    const result = await verifyLicenseWithServer(sampleRml1Key);
    expect(result).toEqual({ valid: false, reason: "MISSING_API_KEY" });
  });

  it("returns invalid when check-in reports revoked", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: "revoked" }),
    } as Response);

    const result = await verifyLicenseWithServer(sampleRml1Key);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("REVOKED");
  });
});

describe("updateLocalLicense", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  it("returns undefined when serverResponse is invalid", async () => {
    const result = await updateLocalLicense(db as never, "RM-KEY", {
      valid: false,
      reason: "INVALID_LICENSE",
    });
    expect(result).toBeUndefined();
  });

  it("creates a new license when key does not exist locally", async () => {
    mockGetLicenseByKey.mockResolvedValueOnce(undefined);
    mockCreateLicense.mockResolvedValueOnce(sampleLicense);

    const result = await updateLocalLicense(db as never, sampleRml1Key, {
      valid: true,
      plan: "pro",
      seats: 1,
      expiresAt: "2027-01-01T00:00:00.000Z",
      licenseId: "lic_bootstrap",
      instanceId: "test-instance",
    });

    expect(result).toEqual(sampleLicense);
    expect(mockGetLicenseByKey).toHaveBeenCalledWith(db, sampleRml1Key);
    expect(mockCreateLicense).toHaveBeenCalledTimes(1);
    expect(mockInvalidateLicenseCache).toHaveBeenCalledWith(sampleRml1Key);
  });

  it("deletes existing and recreates when key already exists", async () => {
    mockGetLicenseByKey.mockResolvedValueOnce(sampleLicense);
    mockCreateLicense.mockResolvedValueOnce(sampleLicense);

    vi.mocked(db.delete).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);

    const result = await updateLocalLicense(db as never, sampleRml1Key, {
      valid: true,
      plan: "pro",
      seats: 1,
    });

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

  it("passes metadata with lastCheckinAt and licenseId", async () => {
    mockGetLicenseByKey.mockResolvedValueOnce(undefined);
    mockCreateLicense.mockResolvedValueOnce(sampleLicense);

    await updateLocalLicense(db as never, sampleRml1Key, {
      valid: true,
      plan: "pro",
      licenseId: "lic_bootstrap",
      instanceId: "test-instance",
    });

    const createCall = mockCreateLicense.mock.calls[0][1];
    expect(createCall.metadata).toHaveProperty("lastCheckinAt");
    expect(createCall.metadata.licenseId).toBe("lic_bootstrap");
    expect(createCall.metadata.instanceId).toBe("test-instance");
  });
});

describe("checkIn", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
    mockEnv.LICENSE_API_KEY = "test-api-key";
  });

  it("returns invalid when server says invalid", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: "not found", code: "LICENSE_NOT_FOUND" }),
    } as Response);

    const result = await checkIn(db as never, "plain-key");
    expect(result.valid).toBe(false);
  });

  it("returns valid with full data on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(checkinOkBody),
    } as Response);
    mockGetLicenseByKey.mockResolvedValueOnce(undefined);
    mockCreateLicense.mockResolvedValueOnce(sampleLicense);

    const result = await checkIn(db as never, sampleRml1Key);

    expect(result.valid).toBe(true);
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.plan).toBe("pro");
  });

  it("returns invalid with NETWORK_ERROR reason on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("ENOTFOUND"));

    const result = await checkIn(db as never, sampleRml1Key);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("NETWORK_ERROR");
  });
});

describe("scheduleCheckIn", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    db = mockDb();
    mockEnv.LICENSE_API_KEY = "test-api-key";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a stop function", () => {
    const { stop } = scheduleCheckIn(db as never, sampleRml1Key);
    expect(typeof stop).toBe("function");
  });

  it("calls checkIn after the interval", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(checkinOkBody),
    } as Response);
    mockGetLicenseByKey.mockResolvedValue(undefined);
    mockCreateLicense.mockResolvedValue(sampleLicense);

    scheduleCheckIn(db as never, sampleRml1Key, 1000);

    expect(fetchSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1100);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("stop prevents further calls", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(checkinOkBody),
    } as Response);
    mockGetLicenseByKey.mockResolvedValue(undefined);
    mockCreateLicense.mockResolvedValue(sampleLicense);

    const { stop } = scheduleCheckIn(db as never, sampleRml1Key, 1000);
    stop();

    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses exponential backoff on failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("fail"));
    mockGetLicenseByKey.mockResolvedValue(undefined);
    mockCreateLicense.mockResolvedValue(sampleLicense);

    scheduleCheckIn(db as never, sampleRml1Key, 1000);

    await vi.advanceTimersByTimeAsync(1100);
    expect(mockLoggerError).toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1100);
    expect(mockLoggerError).toHaveBeenCalledTimes(2);
  });
});
