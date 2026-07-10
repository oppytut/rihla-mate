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

vi.mock("@/lib/db/schema/bookings", () => ({
  bookings: {
    id: "bookings.id",
    customerName: "bookings.customerName",
    totalPrice: "bookings.totalPrice",
    status: "bookings.status",
    travelers: "bookings.travelers",
    createdAt: "bookings.createdAt",
  },
}));

vi.mock("@/lib/db/schema/packages", () => ({
  packages: {
    id: "packages.id",
    status: "packages.status",
    category: "packages.category",
  },
}));

const { analyticsRouter } = await import("../trpc/routers/analytics");
const { createCallerFactory } = await import("../trpc/init");

type DrizzleMock = TRPCContext["db"] & {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  offset: ReturnType<typeof vi.fn>;
  leftJoin: ReturnType<typeof vi.fn>;
  groupBy: ReturnType<typeof vi.fn>;
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
    "groupBy",
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

  const callerFactory = createCallerFactory(analyticsRouter);
  return callerFactory(ctx);
}

describe("analyticsRouter.summary", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  it("returns summary with all fields for default days=30", async () => {
    const caller = createCaller(db);

    // Mock bookings count query: select count from bookings where createdAt >= since
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 42 }] as never);

    // Mock total revenue query
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ total: "15000000" }] as never);

    // Mock paid revenue query
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ total: "10000000" }] as never);

    // Mock pending revenue query
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ total: "5000000" }] as never);

    // Mock packages count query: select count from packages where status = published
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 12 }] as never);

    // Mock packages by category query
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.groupBy).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockResolvedValueOnce([
      { category: "umrah", count: 7 },
      { category: "haji", count: 5 },
    ] as never);

    // Mock recent bookings query
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([
      {
        id: "bk-1",
        customerName: "Alice",
        totalPrice: "5000000",
        status: "confirmed",
        travelers: 2,
        createdAt: new Date("2026-06-15"),
      },
    ] as never);

    const result = await caller.summary();

    expect(result).toEqual({
      totalBookings: 42,
      totalRevenue: "15000000",
      paidRevenue: "10000000",
      pendingRevenue: "5000000",
      publishedPackages: 12,
      packagesByCategory: [
        { category: "umrah", count: 7 },
        { category: "haji", count: 5 },
      ],
      recentBookings: [
        {
          id: "bk-1",
          customerName: "Alice",
          totalPrice: "5000000",
          status: "confirmed",
          travelers: 2,
          createdAt: new Date("2026-06-15"),
        },
      ],
      periodDays: 30,
    });
  });

  it("returns correct periodDays when custom days=7", async () => {
    const caller = createCaller(db);

    // Mock all 7 queries
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 5 }] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ total: "3000000" }] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ total: "2000000" }] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ total: "1000000" }] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 8 }] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.groupBy).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockResolvedValueOnce([] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    const result = await caller.summary({ days: 7 });

    expect(result.periodDays).toBe(7);
    expect(result.totalBookings).toBe(5);
    expect(result.totalRevenue).toBe("3000000");
    expect(result.publishedPackages).toBe(8);
  });

  it("returns defaults when all allSettled promises reject", async () => {
    const caller = createCaller(db);

    // All 7 queries reject
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockRejectedValueOnce(new Error("DB error"));

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockRejectedValueOnce(new Error("DB error"));

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockRejectedValueOnce(new Error("DB error"));

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockRejectedValueOnce(new Error("DB error"));

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockRejectedValueOnce(new Error("DB error"));

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.groupBy).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockRejectedValueOnce(new Error("DB error"));

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockRejectedValueOnce(new Error("DB error"));

    const result = await caller.summary();

    expect(result).toEqual({
      totalBookings: 0,
      totalRevenue: "0",
      paidRevenue: "0",
      pendingRevenue: "0",
      publishedPackages: 0,
      packagesByCategory: [],
      recentBookings: [],
      periodDays: 30,
    });
  });

  it("returns periodDays that matches the input days value", async () => {
    const caller = createCaller(db);

    // Mock all 7 queries for days=90
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 100 }] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ total: "50000000" }] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ total: "40000000" }] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ total: "10000000" }] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 25 }] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.groupBy).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockResolvedValueOnce([] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    const result = await caller.summary({ days: 90 });

    expect(result.periodDays).toBe(90);
    expect(result.totalBookings).toBe(100);
    expect(result.totalRevenue).toBe("50000000");
    expect(result.publishedPackages).toBe(25);
  });
});
