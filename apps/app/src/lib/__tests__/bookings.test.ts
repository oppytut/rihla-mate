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

vi.mock("@/lib/utils/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

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

vi.mock("@/lib/db/schema/packages", () => ({
  packages: {
    id: "packages.id",
    title: "packages.title",
    availableDates: "packages.availableDates",
  },
}));

const { bookingsRouter, BOOKING_STATUSES } = await import("../trpc/routers/bookings");
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

  const callerFactory = createCallerFactory(bookingsRouter);
  return callerFactory(ctx);
}

describe("BOOKING_STATUSES", () => {
  it("has exactly 5 values", () => {
    expect(BOOKING_STATUSES).toHaveLength(5);
  });

  it('contains "pending", "confirmed", "cancelled", "completed", "paid"', () => {
    expect(BOOKING_STATUSES).toEqual(["pending", "confirmed", "cancelled", "completed", "paid"]);
  });

  it("is readonly (as const)", () => {
    const [first] = BOOKING_STATUSES;
    expect(first).toBe("pending");
  });
});

describe("normalizeAvailableDates (via create procedure)", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  async function expectCreateWithDates(raw: unknown, expected: "success" | "bad-request") {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([{ id: "pkg-1", availableDates: raw }] as never);

    if (expected === "bad-request") {
      await expect(
        caller.create({
          packageId: "00000000-0000-0000-0000-000000000001",
          departureDate: "2026-07-15",
          customerName: "John Doe",
          travelers: 2,
          totalPrice: "1500000",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      return;
    }

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    vi.mocked(db.insert).mockReturnValueOnce(db as never);
    vi.mocked(db.values).mockReturnValueOnce(db as never);
    vi.mocked(db.returning).mockResolvedValueOnce([{ id: "bk-1", status: "pending" }] as never);

    const result = await caller.create({
      packageId: "00000000-0000-0000-0000-000000000001",
      departureDate: "2026-07-15",
      customerName: "John Doe",
      travelers: 2,
      totalPrice: "1500000",
    });
    expect(result).toBeDefined();
  }

  it("returns parsed array when given a JSON string array", async () => {
    await expectCreateWithDates('["2026-07-15","2026-08-01"]', "success");
  });

  it("returns the array as-is when given a plain array", async () => {
    await expectCreateWithDates(["2026-07-15", "2026-08-01"], "success");
  });

  it("returns empty array for non-array JSON (e.g., a plain string)", async () => {
    await expectCreateWithDates("hello", "bad-request");
  });

  it("returns empty array for malformed JSON string", async () => {
    await expectCreateWithDates("{bad json", "bad-request");
  });

  it("returns empty array for null", async () => {
    await expectCreateWithDates(null, "bad-request");
  });

  it("returns empty array for undefined", async () => {
    await expectCreateWithDates(undefined, "bad-request");
  });

  it("returns empty array for a number", async () => {
    await expectCreateWithDates(42, "bad-request");
  });

  it("returns empty array for an object", async () => {
    await expectCreateWithDates({ key: "value" }, "bad-request");
  });

  it("returns empty array for empty string", async () => {
    await expectCreateWithDates("", "bad-request");
  });

  it("returns parsed array for valid JSON string array", async () => {
    await expectCreateWithDates('["2026-01-01","2026-07-15","2026-01-02"]', "success");
  });
});

describe("bookingsRouter.list", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  const sampleBooking = {
    id: "00000000-0000-0000-0000-000000000001",
    packageId: "00000000-0000-0000-0000-000000000010",
    departureDate: "2026-07-15",
    customerName: "Alice",
    customerEmail: "alice@test.com",
    customerPhone: "081234567",
    travelers: 2,
    totalPrice: "1500000",
    status: "confirmed",
    paymentRef: "PAY-001",
    notes: null,
    createdAt: new Date("2026-06-01"),
    packageTitle: "Bali Adventure",
  };

  it("returns paginated results with items, total, page, limit", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.leftJoin).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockReturnValueOnce(db as never);
    vi.mocked(db.offset).mockResolvedValueOnce([sampleBooking] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 42 }] as never);

    const result = await caller.list({ page: 1, limit: 20 });

    expect(result).toEqual({
      items: [sampleBooking],
      total: 42,
      page: 1,
      limit: 20,
    });
  });

  it("applies search filter when search param provided", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.leftJoin).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockReturnValueOnce(db as never);
    vi.mocked(db.offset).mockResolvedValueOnce([sampleBooking] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 1 }] as never);

    const result = await caller.list({ search: "Alice", page: 1, limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it("applies status filter when status param provided", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.leftJoin).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.orderBy).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockReturnValueOnce(db as never);
    vi.mocked(db.offset).mockResolvedValueOnce([] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce([{ count: 0 }] as never);

    const result = await caller.list({ status: "pending", page: 1, limit: 20 });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

describe("bookingsRouter.getById", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  const sampleBooking = {
    id: "00000000-0000-0000-0000-000000000001",
    packageId: "00000000-0000-0000-0000-000000000010",
    departureDate: "2026-07-15",
    customerName: "Bob",
    customerEmail: "bob@test.com",
    customerPhone: "089876543",
    travelers: 1,
    totalPrice: "750000",
    status: "pending",
    paymentRef: null,
    notes: null,
    createdAt: new Date("2026-05-20"),
    updatedAt: new Date("2026-06-01"),
    packageTitle: "Lombok Escape",
  };

  it("returns booking when found", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.leftJoin).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([sampleBooking] as never);

    const result = await caller.getById({
      id: "00000000-0000-0000-0000-000000000001",
    });

    expect(result).toEqual(sampleBooking);
  });

  it("throws NOT_FOUND when booking doesn't exist", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.leftJoin).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    await expect(
      caller.getById({ id: "00000000-0000-0000-0000-000000000099" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("bookingsRouter.create", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  const validInput = {
    packageId: "00000000-0000-0000-0000-000000000001",
    departureDate: "2026-07-15",
    customerName: "John Doe",
    customerEmail: "john@test.com",
    customerPhone: "081111111",
    travelers: 2,
    totalPrice: "1500000",
    status: "pending" as const,
    paymentRef: "PAY-123",
    notes: "Window seat please",
  };

  it("throws NOT_FOUND when package doesn't exist", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    await expect(caller.create(validInput)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws BAD_REQUEST when departure date not available", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([
      {
        id: "00000000-0000-0000-0000-000000000001",
        availableDates: ["2026-08-01", "2026-09-01"],
      },
    ] as never);

    await expect(caller.create(validInput)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("throws CONFLICT when booking already exists for same package+date", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([
      {
        id: "00000000-0000-0000-0000-000000000001",
        availableDates: ["2026-07-15", "2026-08-01"],
      },
    ] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([
      { id: "00000000-0000-0000-0000-000000000099" },
    ] as never);

    await expect(caller.create(validInput)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("creates booking successfully with valid input", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([
      {
        id: "00000000-0000-0000-0000-000000000001",
        availableDates: ["2026-07-15", "2026-08-01"],
      },
    ] as never);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    const created = {
      id: "00000000-0000-0000-0000-000000000050",
      packageId: validInput.packageId,
      departureDate: validInput.departureDate,
      customerName: validInput.customerName,
      customerEmail: validInput.customerEmail,
      customerPhone: validInput.customerPhone,
      travelers: validInput.travelers,
      totalPrice: validInput.totalPrice,
      status: validInput.status,
      paymentRef: validInput.paymentRef,
      notes: validInput.notes,
    };

    vi.mocked(db.insert).mockReturnValueOnce(db as never);
    vi.mocked(db.values).mockReturnValueOnce(db as never);
    vi.mocked(db.returning).mockResolvedValueOnce([created] as never);

    const result = await caller.create(validInput);

    expect(result).toEqual(created);
  });
});

describe("bookingsRouter.update", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  const bookingId = "00000000-0000-0000-0000-000000000001";

  it("throws NOT_FOUND when booking doesn't exist", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    await expect(caller.update({ id: bookingId, customerName: "New Name" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("updates booking fields successfully", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([{ id: bookingId }] as never);

    const updated = {
      id: bookingId,
      customerName: "Updated Name",
      customerEmail: "updated@test.com",
      status: "confirmed",
    };

    vi.mocked(db.update).mockReturnValueOnce(db as never);
    vi.mocked(db.set).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.returning).mockResolvedValueOnce([updated] as never);

    const result = await caller.update({
      id: bookingId,
      customerName: "Updated Name",
      customerEmail: "updated@test.com",
      status: "confirmed",
    });

    expect(result).toEqual(updated);
  });

  it("allows valid departureDate update", async () => {
    const caller = createCaller(db);

    // (a) existing booking check
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([{ id: bookingId }] as never);

    // (b) resolve packageId from booking
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([{ packageId: "pkg-1" }] as never);

    // (c) package lookup with availableDates
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([
      { id: "pkg-1", availableDates: ["2026-07-15", "2026-08-01"] },
    ] as never);

    // (d) date conflict check → no conflict
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    // (e) update
    const updated = { id: bookingId, departureDate: "2026-07-15" };
    vi.mocked(db.update).mockReturnValueOnce(db as never);
    vi.mocked(db.set).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.returning).mockResolvedValueOnce([updated] as never);

    const result = await caller.update({ id: bookingId, departureDate: "2026-07-15" });

    expect(result).toEqual(updated);
  });

  it("rejects departureDate not in availableDates", async () => {
    const caller = createCaller(db);

    // (a) existing booking check
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([{ id: bookingId }] as never);

    // (b) resolve packageId from booking
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([{ packageId: "pkg-1" }] as never);

    // (c) package lookup with availableDates
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([
      { id: "pkg-1", availableDates: ["2026-07-15", "2026-08-01"] },
    ] as never);

    await expect(
      caller.update({ id: bookingId, departureDate: "2026-12-25" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects departureDate with conflicting booking", async () => {
    const caller = createCaller(db);

    // (a) existing booking check
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([{ id: bookingId }] as never);

    // (b) resolve packageId from booking
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([{ packageId: "pkg-1" }] as never);

    // (c) package lookup with availableDates
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([
      { id: "pkg-1", availableDates: ["2026-07-15", "2026-08-01"] },
    ] as never);

    // (d) date conflict check → conflict found
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([{ id: "other-booking" }] as never);

    await expect(
      caller.update({ id: bookingId, departureDate: "2026-07-15" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("throws NOT_FOUND when packageId not found", async () => {
    const caller = createCaller(db);

    // (a) existing booking check
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([{ id: bookingId }] as never);

    // (b) package lookup → empty (not found)
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    await expect(
      caller.update({ id: bookingId, packageId: "00000000-0000-0000-0000-000000000099" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("allows valid packageId update", async () => {
    const caller = createCaller(db);

    // (a) existing booking check
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([{ id: bookingId }] as never);

    // (b) package lookup
    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([
      { id: "pkg-2", availableDates: ["2026-08-01"] },
    ] as never);

    // (c) update
    const updated = { id: bookingId, packageId: "00000000-0000-0000-0000-000000000002" };
    vi.mocked(db.update).mockReturnValueOnce(db as never);
    vi.mocked(db.set).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.returning).mockResolvedValueOnce([updated] as never);

    const result = await caller.update({
      id: bookingId,
      packageId: "00000000-0000-0000-0000-000000000002",
    });

    expect(result).toEqual(updated);
  });
});

describe("bookingsRouter.delete", () => {
  let db: ReturnType<typeof mockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
  });

  const bookingId = "00000000-0000-0000-0000-000000000001";

  it("throws NOT_FOUND when booking doesn't exist", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    await expect(caller.delete({ id: bookingId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("deletes booking and returns success", async () => {
    const caller = createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([{ id: bookingId }] as never);

    vi.mocked(db.delete).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce(undefined as never);

    const result = await caller.delete({ id: bookingId });

    expect(result).toEqual({ success: true });
  });
});
