import { describe, it, expect, beforeEach, vi } from "vitest";
import { initTRPC } from "@trpc/server";
import type { TRPCContext } from "../trpc/context";

vi.mock("../trpc/init", async () => {
  const t = initTRPC.context<TRPCContext>().create({
    transformer: { serialize: (v: unknown) => v, deserialize: (v: unknown) => v },
    errorFormatter: ({ shape }) => shape,
  });
  return {
    createTRPCRouter: t.router,
    createCallerFactory: t.createCallerFactory,
    publicProcedure: t.procedure,
    adminProcedure: t.procedure,
  };
});

vi.mock("@/lib/license/store", () => ({
  licenseKeys: {
    id: "licenseKeys.id",
    key: "licenseKeys.key",
    type: "licenseKeys.type",
    seats: "licenseKeys.seats",
    issuedAt: "licenseKeys.issuedAt",
    expiresAt: "licenseKeys.expiresAt",
    revokedAt: "licenseKeys.revokedAt",
    metadata: "licenseKeys.metadata",
  },
  getLicenseByKey: vi.fn(),
  revokeLicense: vi.fn(),
  invalidateLicenseCache: vi.fn(),
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const { licenseAdminRouter } = await import("../trpc/routers/license-admin");
const { createCallerFactory } = await import("../trpc/init");

/**
 * Mock type that extends the real Drizzle client with chainable query-builder
 * methods so that tests can mock each step of a query chain individually via
 * vi.mocked().  The real `NodePgDatabase` only exposes entry-point methods
 * (select, insert, update, delete); the chain methods live on the builders
 * those entry points return.  This intersection gives the mock all of them
 * at the top level without touching source code.
 */
type DrizzleMock = TRPCContext["db"] & {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  offset: ReturnType<typeof vi.fn>;
  values: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
};

function mockDb(): DrizzleMock {
  const db: Record<string, unknown> = {};

  const methods = [
    "select",
    "from",
    "where",
    "orderBy",
    "limit",
    "offset",
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

  return db as unknown as DrizzleMock;
}

function createCaller(db: DrizzleMock) {
  const ctx: TRPCContext = {
    headers: new Headers(),
    db,
    session: {
      session: {
        id: "sess-1",
        userId: "user-1",
        expiresAt: new Date(),
        token: "tok",
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      user: {
        id: "user-1",
        email: "admin@test.com",
        emailVerified: true,
        name: "Admin",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  };

  const callerFactory = createCallerFactory(licenseAdminRouter);
  return callerFactory(ctx);
}

const sampleLicense = {
  id: "00000000-0000-0000-0000-000000000001",
  key: "RML1.abc123.def456",
  type: "pro" as const,
  seats: 10,
  issuedAt: new Date("2026-01-01"),
  expiresAt: new Date("2027-01-01"),
  revokedAt: null,
  metadata: { plan: "pro" },
};

const revokedLicense = {
  ...sampleLicense,
  key: "RML1.revoked.key001",
  revokedAt: new Date("2026-06-15"),
} as const;

// ---------------------------------------------------------------------------
// licenseAdminRouter.list
// ---------------------------------------------------------------------------

describe("licenseAdminRouter.list", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  it("returns paginated results with items, total, page, limit", async () => {
    const caller = createCaller(db);

    // items query chain: select → from → where → orderBy → limit → offset
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockReturnValueOnce(db as never);
    vi.mocked(db.offset).mockResolvedValueOnce([sampleLicense] as never);

    // count query: select → from → where
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 42 }] as never);

    const result = await caller.list({ page: 1, limit: 20 });

    expect(result).toEqual({
      items: [sampleLicense],
      total: 42,
      page: 1,
      limit: 20,
    });
  });

  it("applies search filter when search param provided", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockReturnValueOnce(db as never);
    vi.mocked(db.offset).mockResolvedValueOnce([sampleLicense] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 1 }] as never);

    const result = await caller.list({ search: "RML1", page: 1, limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("returns empty items and total=0 when no results", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockReturnValueOnce(db as never);
    vi.mocked(db.offset).mockResolvedValueOnce([] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 0 }] as never);

    const result = await caller.list({ page: 1, limit: 20 });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("throws INTERNAL_SERVER_ERROR when items query rejects", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockReturnValueOnce(db as never);
    vi.mocked(db.offset).mockRejectedValueOnce(new Error("DB connection lost"));

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 42 }] as never);

    await expect(caller.list({ page: 1, limit: 20 })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });

  it("returns total=0 when count query rejects but items succeed", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockReturnValueOnce(db as never);
    vi.mocked(db.offset).mockResolvedValueOnce([sampleLicense] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockRejectedValueOnce(new Error("Count failed"));

    const result = await caller.list({ page: 1, limit: 20 });

    expect(result.items).toEqual([sampleLicense]);
    expect(result.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// licenseAdminRouter.getStatus
// ---------------------------------------------------------------------------

describe("licenseAdminRouter.getStatus", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  it("returns active and total counts", async () => {
    const caller = createCaller(db);

    // active count query: select → from → where
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 15 }] as never);

    // total count query: select → from
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockResolvedValueOnce([{ count: 30 }] as never);

    const result = await caller.getStatus();

    expect(result).toEqual({ active: 15, total: 30 });
  });

  it("returns active=0 when active count query rejects", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockRejectedValueOnce(new Error("Active count failed"));

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockResolvedValueOnce([{ count: 30 }] as never);

    const result = await caller.getStatus();

    expect(result).toEqual({ active: 0, total: 30 });
  });

  it("returns total=0 when total count query rejects", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 15 }] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockRejectedValueOnce(new Error("Total count failed"));

    const result = await caller.getStatus();

    expect(result).toEqual({ active: 15, total: 0 });
  });
});

// ---------------------------------------------------------------------------
// licenseAdminRouter.revoke
// ---------------------------------------------------------------------------

describe("licenseAdminRouter.revoke", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  it("revokes a license successfully and returns revoked data", async () => {
    const caller = createCaller(db);
    const { getLicenseByKey, revokeLicense, invalidateLicenseCache } =
      await import("@/lib/license/store");

    vi.mocked(getLicenseByKey).mockResolvedValueOnce(sampleLicense);
    vi.mocked(revokeLicense).mockResolvedValueOnce(revokedLicense);

    const result = await caller.revoke({ key: sampleLicense.key });

    expect(getLicenseByKey).toHaveBeenCalledWith(db, sampleLicense.key);
    expect(revokeLicense).toHaveBeenCalledWith(db, sampleLicense.key);
    expect(invalidateLicenseCache).toHaveBeenCalledWith(sampleLicense.key);
    expect(result).toEqual(revokedLicense);
  });

  it("throws NOT_FOUND when license key does not exist", async () => {
    const caller = createCaller(db);
    const { getLicenseByKey } = await import("@/lib/license/store");

    vi.mocked(getLicenseByKey).mockResolvedValueOnce(undefined);

    await expect(caller.revoke({ key: "RML1.nonexistent.key" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws CONFLICT when license is already revoked", async () => {
    const caller = createCaller(db);
    const { getLicenseByKey } = await import("@/lib/license/store");

    vi.mocked(getLicenseByKey).mockResolvedValueOnce(revokedLicense);

    await expect(caller.revoke({ key: revokedLicense.key })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("returns the revoked license row from the store", async () => {
    const caller = createCaller(db);
    const { getLicenseByKey, revokeLicense } = await import("@/lib/license/store");

    vi.mocked(getLicenseByKey).mockResolvedValueOnce(sampleLicense);
    vi.mocked(revokeLicense).mockResolvedValueOnce(revokedLicense);

    const result = await caller.revoke({ key: sampleLicense.key });

    if (!result) throw new Error("Expected result to be defined");
    expect(result).toHaveProperty("revokedAt");
    expect(result.revokedAt).toEqual(revokedLicense.revokedAt);
    expect(result.key).toBe(revokedLicense.key);
  });
});
