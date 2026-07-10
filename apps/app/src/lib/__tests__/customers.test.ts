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
    packageId: "bookings.packageId",
    departureDate: "bookings.departureDate",
    customerName: "bookings.customerName",
    customerEmail: "bookings.customerEmail",
    customerPhone: "bookings.customerPhone",
    travelers: "bookings.travelers",
    totalPrice: "bookings.totalPrice",
    status: "bookings.status",
    paymentRef: "bookings.paymentRef",
    notes: "bookings.notes",
    createdAt: "bookings.createdAt",
    updatedAt: "bookings.updatedAt",
  },
}));

const { customersRouter } = await import("../trpc/routers/customers");
const { createCallerFactory } = await import("../trpc/init");

type DrizzleMock = TRPCContext["db"] & {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  offset: ReturnType<typeof vi.fn>;
  groupBy: ReturnType<typeof vi.fn>;
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
    "groupBy",
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

  const callerFactory = createCallerFactory(customersRouter);
  return callerFactory(ctx);
}

describe("customersRouter.list", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  const sampleCustomer = {
    customerName: "Alice",
    customerEmail: "alice@test.com",
    customerPhone: "081234567",
    totalBookings: 3,
    totalSpent: "4500000",
    lastBookingDate: "2026-07-01T00:00:00.000Z",
  };

  it("returns paginated results with items, total, page, limit", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.groupBy).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockReturnValueOnce(db as never);
    vi.mocked(db.offset).mockResolvedValueOnce([sampleCustomer] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 15 }] as never);

    const result = await caller.list({ page: 1, limit: 20 });

    expect(result).toEqual({
      items: [sampleCustomer],
      total: 15,
      page: 1,
      limit: 20,
    });
  });

  it("applies search filter when search param provided", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.groupBy).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockReturnValueOnce(db as never);
    vi.mocked(db.offset).mockResolvedValueOnce([sampleCustomer] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 1 }] as never);

    const result = await caller.list({ search: "Alice", page: 1, limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("throws INTERNAL_SERVER_ERROR when items query rejects", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.groupBy).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockReturnValueOnce(db as never);
    vi.mocked(db.offset).mockRejectedValueOnce(new Error("DB connection lost"));

    await expect(caller.list({ page: 1, limit: 20 })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });

  it("returns total=0 when count query rejects but items succeed", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.groupBy).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockReturnValueOnce(db as never);
    vi.mocked(db.offset).mockResolvedValueOnce([sampleCustomer] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockRejectedValueOnce(new Error("Count failed"));

    const result = await caller.list({ page: 1, limit: 20 });

    expect(result.items).toEqual([sampleCustomer]);
    expect(result.total).toBe(0);
  });
});

describe("customersRouter.getBookings", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  const sampleBooking = {
    id: "00000000-0000-0000-0000-000000000001",
    packageId: "00000000-0000-0000-0000-000000000010",
    departureDate: "2026-07-15",
    travelers: 2,
    totalPrice: "1500000",
    status: "confirmed",
    createdAt: new Date("2026-06-01"),
  };

  it("returns paginated bookings for a customer", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockReturnValueOnce(db as never);
    vi.mocked(db.offset).mockResolvedValueOnce([sampleBooking] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 3 }] as never);

    const result = await caller.getBookings({
      customerName: "Alice",
      page: 1,
      limit: 10,
    });

    expect(result).toEqual({
      items: [sampleBooking],
      total: 3,
      page: 1,
      limit: 10,
    });
  });

  it("applies customerEmail filter when provided", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockReturnValueOnce(db as never);
    vi.mocked(db.offset).mockResolvedValueOnce([sampleBooking] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 1 }] as never);

    const result = await caller.getBookings({
      customerName: "Alice",
      customerEmail: "alice@test.com",
      page: 1,
      limit: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("throws INTERNAL_SERVER_ERROR when items query rejects", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockReturnValueOnce(db as never);
    vi.mocked(db.offset).mockRejectedValueOnce(new Error("DB connection lost"));

    await expect(
      caller.getBookings({ customerName: "Alice", page: 1, limit: 10 }),
    ).rejects.toMatchObject({
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
    vi.mocked(db.offset).mockResolvedValueOnce([sampleBooking] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockRejectedValueOnce(new Error("Count failed"));

    const result = await caller.getBookings({
      customerName: "Alice",
      page: 1,
      limit: 10,
    });

    expect(result.items).toEqual([sampleBooking]);
    expect(result.total).toBe(0);
  });
});
