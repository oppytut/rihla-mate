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
    protectedProcedure: t.procedure,
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
    midtransOrderId: "bookings.midtransOrderId",
    midtransTransactionId: "bookings.midtransTransactionId",
    paymentMethod: "bookings.paymentMethod",
    paymentChannel: "bookings.paymentChannel",
    grossAmount: "bookings.grossAmount",
    transactionStatus: "bookings.transactionStatus",
    notes: "bookings.notes",
    createdAt: "bookings.createdAt",
    updatedAt: "bookings.updatedAt",
  },
}));

vi.mock("@/lib/db/schema/packages", () => ({
  packages: {
    id: "packages.id",
    title: "packages.title",
    slug: "packages.slug",
    description: "packages.description",
    durationDays: "packages.durationDays",
    price: "packages.price",
    currency: "packages.currency",
    itinerary: "packages.itinerary",
    inclusions: "packages.inclusions",
    exclusions: "packages.exclusions",
    departureCity: "packages.departureCity",
    availableDates: "packages.availableDates",
    featuredImage: "packages.featuredImage",
    gallery: "packages.gallery",
    category: "packages.category",
    status: "packages.status",
    createdAt: "packages.createdAt",
    updatedAt: "packages.updatedAt",
  },
}));

vi.mock("@/env", () => ({
  env: {
    DATABASE_URL: "postgres://localhost:5432/test",
    BETTER_AUTH_SECRET: "test-secret",
    MIDTRANS_SERVER_KEY: "SB-Mid-server-testkey",
    MIDTRANS_CLIENT_KEY: "SB-Mid-client-testkey",
    STORAGE_DRIVER: "local",
  },
}));

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

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

type DrizzleMockInstance = ReturnType<typeof mockDb>;

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

// ---------------------------------------------------------------------------
// Tests — publicMidtransRouter.createTransaction
// ---------------------------------------------------------------------------

describe("publicMidtransRouter.createTransaction", () => {
  let db: DrizzleMockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    // Default success response for Snap transactions
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          token: "snap-token-txn",
          redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-txn",
        }),
    });
    db = mockDb();
  });

  const bookingId = "00000000-0000-0000-0000-000000000001";
  const pkgId = "00000000-0000-0000-0000-000000000010";

  const pendingBooking = {
    id: bookingId,
    packageId: pkgId,
    totalPrice: "1500000",
    status: "pending",
    customerName: "John Doe",
    customerEmail: "john@test.com",
    customerPhone: "08123456789",
    midtransOrderId: null,
    packageTitle: "Bali Adventure",
    packagePrice: "1500000",
  };

  /**
   * Creates a tRPC caller wired to a mock db.
   * Dynamically imports modules so vi.doMock in tests can override them.
   */
  async function createCaller(mockDb_: DrizzleMockInstance) {
    vi.resetModules();
    vi.doMock("@/env", () => ({
      env: {
        MIDTRANS_SERVER_KEY: "SB-Mid-server-testkey",
        MIDTRANS_CLIENT_KEY: "SB-Mid-client-testkey",
      },
    }));
    const { createCallerFactory } = await import("../trpc/init");
    const { publicMidtransRouter } = await import("../trpc/routers/public-midtrans");
    const factory = createCallerFactory(publicMidtransRouter);
    return factory({
      headers: new Headers(),
      db: mockDb_,
    } as unknown as TRPCContext);
  }

  it("throws INTERNAL_SERVER_ERROR when midtrans is not configured", async () => {
    vi.doMock("@/env", () => ({
      env: {
        MIDTRANS_SERVER_KEY: undefined,
        MIDTRANS_CLIENT_KEY: undefined,
      },
    }));
    vi.resetModules();

    // Re-import router with the env mock active
    const { createCallerFactory } = await import("../trpc/init");
    const { publicMidtransRouter: unconfiguredRouter } =
      await import("../trpc/routers/public-midtrans");
    const callerFactory = createCallerFactory(unconfiguredRouter);
    const caller = callerFactory({
      headers: new Headers(),
      db,
    } as unknown as TRPCContext);

    await expect(caller.createTransaction({ bookingId })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });

  it("throws NOT_FOUND when booking does not exist", async () => {
    const caller = await createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.leftJoin).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([] as never);

    await expect(caller.createTransaction({ bookingId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws BAD_REQUEST when booking status is not pending", async () => {
    const caller = await createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.leftJoin).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([
      { ...pendingBooking, status: "confirmed" },
    ] as never);

    await expect(caller.createTransaction({ bookingId })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("throws BAD_REQUEST when booking status is cancelled", async () => {
    const caller = await createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.leftJoin).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([
      { ...pendingBooking, status: "cancelled" },
    ] as never);

    await expect(caller.createTransaction({ bookingId })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("returns null token and redirectUrl when midtransOrderId already exists", async () => {
    const caller = await createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.leftJoin).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([
      { ...pendingBooking, midtransOrderId: "RIHLA-existing-order" },
    ] as never);

    const result = await caller.createTransaction({ bookingId });

    expect(result).toEqual({ token: null, redirectUrl: null });
  });

  it("creates a Snap transaction and updates booking with orderId", async () => {
    const caller = await createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.leftJoin).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([pendingBooking] as never);

    vi.mocked(db.update).mockReturnValueOnce(db as never);
    vi.mocked(db.set).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce(undefined as never);

    const result = await caller.createTransaction({ bookingId });

    expect(result.token).toBe("snap-token-txn");
    expect(result.redirectUrl).toBe(
      "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-txn",
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const fetchCall = mockFetch.mock.calls.find((call) =>
      (call[0] as string).includes("/snap/v1/transactions"),
    );
    if (!fetchCall) throw new Error("Expected fetch call not found");
    const body = JSON.parse(fetchCall[1].body as string);
    expect(body.transaction_details.order_id).toMatch(/^RIHLA-/);
    expect(body.transaction_details.gross_amount).toBe(1500000);
    expect(body.item_details[0].id).toBe(pkgId);
    expect(body.item_details[0].name).toBe("Bali Adventure");
  });

  it("handles booking with null customerEmail and customerPhone", async () => {
    const caller = await createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.leftJoin).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([
      {
        ...pendingBooking,
        customerEmail: null,
        customerPhone: null,
      },
    ] as never);

    vi.mocked(db.update).mockReturnValueOnce(db as never);
    vi.mocked(db.set).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce(undefined as never);

    const result = await caller.createTransaction({ bookingId });

    expect(result.token).toBe("snap-token-txn");
    const fetchCall = mockFetch.mock.calls.find((call) =>
      (call[0] as string).includes("/snap/v1/transactions"),
    );
    if (!fetchCall) throw new Error("Expected fetch call not found");
    const body = JSON.parse(fetchCall[1].body as string);
    expect(body.customer_details.email).toBe("");
    expect(body.customer_details.phone).toBeUndefined();
  });

  it("handles booking with missing package (packageTitle is null)", async () => {
    const caller = await createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.leftJoin).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([
      {
        ...pendingBooking,
        packageTitle: null,
        packagePrice: null,
      },
    ] as never);

    vi.mocked(db.update).mockReturnValueOnce(db as never);
    vi.mocked(db.set).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockResolvedValueOnce(undefined as never);

    const result = await caller.createTransaction({ bookingId });

    expect(result.token).toBe("snap-token-txn");
    const fetchCall = mockFetch.mock.calls.find((call) =>
      (call[0] as string).includes("/snap/v1/transactions"),
    );
    if (!fetchCall) throw new Error("Expected fetch call not found");
    const body = JSON.parse(fetchCall[1].body as string);
    // Falls back to "Booking" when packageTitle is null
    expect(body.item_details[0].name).toBe("Booking");
  });

  it("propagates midtrans API errors", async () => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Connection timeout"),
    });

    const caller = await createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.leftJoin).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([pendingBooking] as never);

    await expect(caller.createTransaction({ bookingId })).rejects.toThrow(
      "Midtrans Snap API error (500): Connection timeout",
    );
  });
});
