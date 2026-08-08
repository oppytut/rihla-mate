import { describe, it, expect, vi } from "vitest";
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

vi.mock("@/lib/utils/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/db/schema/bookings", () => ({
  bookings: {
    id: "bookings.id",
    customerName: "bookings.customerName",
    totalPrice: "bookings.totalPrice",
    status: "bookings.status",
    travelers: "bookings.travelers",
    createdAt: "bookings.createdAt",
    packageId: "bookings.packageId",
  },
}));

vi.mock("@/lib/db/schema/packages", () => ({
  packages: {
    id: "packages.id",
    status: "packages.status",
    title: "packages.title",
  },
}));

const { dashboardRouter } = await import("../trpc/routers/dashboard");
const { createCallerFactory } = await import("../trpc/init");

type DrizzleMock = TRPCContext["db"] & {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  offset: ReturnType<typeof vi.fn>;
  leftJoin: ReturnType<typeof vi.fn>;
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

  const callerFactory = createCallerFactory(dashboardRouter);
  return callerFactory(ctx);
}

const sampleRecent = [
  {
    id: "b-1",
    customerName: "Aisha",
    totalPrice: "25000000",
    status: "pending",
    travelers: 2,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    packageTitle: "Umrah Ekonomi",
  },
];

describe("dashboardRouter.stats", () => {
  it("returns dashboard stats", async () => {
    const db = mockDb();

    vi.mocked(db.from)
      .mockResolvedValueOnce([{ count: 42 }])
      .mockReturnValueOnce(db)
      .mockResolvedValueOnce([{ count: 15 }])
      .mockReturnValueOnce(db)
      .mockReturnValueOnce(db)
      .mockReturnValueOnce(db);

    vi.mocked(db.where)
      .mockResolvedValueOnce([{ count: 8 }])
      .mockResolvedValueOnce([{ total: "50000" }])
      .mockResolvedValueOnce([{ count: 3 }]);

    vi.mocked(db.limit).mockResolvedValueOnce(sampleRecent);

    const caller = createCaller(db);
    const result = await caller.stats();

    expect(result).toEqual({
      totalBookings: 42,
      activePackages: 8,
      totalCustomers: 15,
      revenue: "50000",
      pendingBookings: 3,
      recentBookings: sampleRecent,
    });
  });

  it("handles empty data", async () => {
    const db = mockDb();

    vi.mocked(db.from)
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(db)
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(db)
      .mockReturnValueOnce(db)
      .mockReturnValueOnce(db);

    vi.mocked(db.where)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    vi.mocked(db.limit).mockResolvedValueOnce([]);

    const caller = createCaller(db);
    const result = await caller.stats();

    expect(result).toEqual({
      totalBookings: 0,
      activePackages: 0,
      totalCustomers: 0,
      revenue: "0",
      pendingBookings: 0,
      recentBookings: [],
    });
  });

  it("handles DB failure", async () => {
    const db = mockDb();

    vi.mocked(db.from)
      .mockRejectedValueOnce(new Error("DB connection lost"))
      .mockReturnValueOnce(db)
      .mockRejectedValueOnce(new Error("DB connection lost"))
      .mockReturnValueOnce(db)
      .mockReturnValueOnce(db)
      .mockReturnValueOnce(db);

    vi.mocked(db.where)
      .mockRejectedValueOnce(new Error("DB connection lost"))
      .mockRejectedValueOnce(new Error("DB connection lost"))
      .mockRejectedValueOnce(new Error("DB connection lost"));

    vi.mocked(db.limit).mockRejectedValueOnce(new Error("DB connection lost"));

    const caller = createCaller(db);
    const result = await caller.stats();

    expect(result).toEqual({
      totalBookings: 0,
      activePackages: 0,
      totalCustomers: 0,
      revenue: "0",
      pendingBookings: 0,
      recentBookings: [],
    });
  });
});
