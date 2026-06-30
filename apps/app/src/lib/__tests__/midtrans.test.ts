import { createHash } from "node:crypto";
import { describe, it, expect, beforeEach, beforeAll, vi } from "vitest";
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

const mockSnapCreateTransaction = vi.fn();
const mockCoreApiTransactionStatus = vi.fn();

vi.mock("midtrans-client", () => ({
  default: {
    Snap: vi.fn().mockImplementation(() => ({
      createTransaction: mockSnapCreateTransaction,
    })),
    CoreApi: vi.fn().mockImplementation(() => ({
      transaction: { status: mockCoreApiTransactionStatus },
    })),
  },
}));

// Top-level imports removed — modules are imported dynamically
// within each describe block so vi.doMock can override cached modules
// in the webhook tests.

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

describe("createSnapTransaction", () => {
  let createSnapTransaction: typeof import("../payment/midtrans").createSnapTransaction;

  beforeAll(async () => {
    const mod = await import("../payment/midtrans");
    createSnapTransaction = mod.createSnapTransaction;
  });

  const validParams = {
    orderId: "RIHLA-test-123",
    grossAmount: 1500000,
    items: [
      {
        id: "pkg-1",
        price: 1500000,
        quantity: 1,
        name: "Bali Adventure",
        category: "adventure",
      },
    ],
    customer: {
      firstName: "John",
      lastName: "Doe",
      email: "john@test.com",
      phone: "08123456789",
    },
    callbacks: {
      finish: "https://example.com/finish",
      error: "https://example.com/error",
      pending: "https://example.com/pending",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns token and redirectUrl on successful transaction", async () => {
    mockSnapCreateTransaction.mockResolvedValueOnce({
      token: "snap-token-abc-123",
      redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-abc-123",
    });

    const result = await createSnapTransaction(validParams);

    expect(result).toEqual({
      token: "snap-token-abc-123",
      redirectUrl: "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-abc-123",
    });
    expect(mockSnapCreateTransaction).toHaveBeenCalledTimes(1);
    expect(mockSnapCreateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction_details: {
          order_id: "RIHLA-test-123",
          gross_amount: 1500000,
        },
      }),
    );
  });

  it("propagates error when midtrans API throws", async () => {
    mockSnapCreateTransaction.mockRejectedValueOnce(new Error("Midtrans API error"));

    await expect(createSnapTransaction(validParams)).rejects.toThrow("Midtrans API error");
  });

  it("works with minimal customer data (email only)", async () => {
    mockSnapCreateTransaction.mockResolvedValueOnce({
      token: "snap-token-min",
      redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-min",
    });

    const result = await createSnapTransaction({
      orderId: "RIHLA-min-1",
      grossAmount: 50000,
      items: [{ id: "pkg-2", price: 50000, quantity: 1, name: "Test" }],
      customer: { email: "min@test.com" },
    });

    expect(result.token).toBe("snap-token-min");
    expect(mockSnapCreateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_details: expect.objectContaining({
          email: "min@test.com",
        }),
      }),
    );
  });

  it("works with zero amount (free booking)", async () => {
    mockSnapCreateTransaction.mockResolvedValueOnce({
      token: "snap-token-free",
      redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-free",
    });

    const result = await createSnapTransaction({
      orderId: "RIHLA-free-1",
      grossAmount: 0,
      items: [{ id: "pkg-3", price: 0, quantity: 1, name: "Free Tour" }],
      customer: { email: "free@test.com" },
    });

    expect(result.token).toBe("snap-token-free");
    expect(mockSnapCreateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction_details: expect.objectContaining({ gross_amount: 0 }),
      }),
    );
  });

  it("omits optional fields when not provided", async () => {
    mockSnapCreateTransaction.mockResolvedValueOnce({
      token: "snap-token-no-opt",
      redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-no-opt",
    });

    const result = await createSnapTransaction({
      orderId: "RIHLA-no-opt",
      grossAmount: 100000,
      items: [{ id: "pkg-4", price: 100000, quantity: 1, name: "Basic" }],
      customer: { email: "basic@test.com" },
    });

    expect(result.token).toBe("snap-token-no-opt");

    const callArg = mockSnapCreateTransaction.mock.calls[0][0];
    expect(callArg.callbacks.finish).toBeUndefined();
    expect(callArg.callbacks.error).toBeUndefined();
    expect(callArg.callbacks.pending).toBeUndefined();
    expect(callArg.item_details[0].category).toBeUndefined();
  });

  it("passes through callbacks when provided", async () => {
    mockSnapCreateTransaction.mockResolvedValueOnce({
      token: "snap-token-cb",
      redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-cb",
    });

    await createSnapTransaction(validParams);

    const callArg = mockSnapCreateTransaction.mock.calls[0][0];
    expect(callArg.callbacks.finish).toBe("https://example.com/finish");
    expect(callArg.callbacks.error).toBe("https://example.com/error");
    expect(callArg.callbacks.pending).toBe("https://example.com/pending");
  });
});

describe("verifyWebhookSignature", () => {
  let verifyWebhookSignature: typeof import("../payment/midtrans").verifyWebhookSignature;

  beforeAll(async () => {
    const mod = await import("../payment/midtrans");
    verifyWebhookSignature = mod.verifyWebhookSignature;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true for a valid signature", () => {
    // The env mock provides MIDTRANS_SERVER_KEY = "SB-Mid-server-testkey"
    const orderId = "RIHLA-order-1";
    const statusCode = "200";
    const grossAmount = "1500000";
    const serverKey = "SB-Mid-server-testkey";
    const expected = createHash("sha512")
      .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
      .digest("hex");

    const result = verifyWebhookSignature(orderId, statusCode, grossAmount, expected);
    expect(result).toBe(true);
  });

  it("returns false for an invalid signature (wrong server key)", () => {
    const result = verifyWebhookSignature("RIHLA-order-1", "200", "1500000", "wrong-signature-key");
    expect(result).toBe(false);
  });

  it("returns false when signature length differs", () => {
    const result = verifyWebhookSignature("RIHLA-order-1", "200", "1500000", "short");
    expect(result).toBe(false);
  });

  it("returns false for empty signature key", () => {
    const result = verifyWebhookSignature("RIHLA-order-1", "200", "1500000", "");
    expect(result).toBe(false);
  });

  it("returns false when orderId differs", () => {
    const serverKey = "SB-Mid-server-testkey";
    const expected = createHash("sha512")
      .update(`RIHLA-correct-order${"200"}${"1500000"}${serverKey}`)
      .digest("hex");

    const result = verifyWebhookSignature("RIHLA-wrong-order", "200", "1500000", expected);
    expect(result).toBe(false);
  });

  it("returns false when statusCode differs", () => {
    const serverKey = "SB-Mid-server-testkey";
    const expected = createHash("sha512")
      .update(`RIHLA-order-1${"200"}${"1500000"}${serverKey}`)
      .digest("hex");

    const result = verifyWebhookSignature("RIHLA-order-1", "201", "1500000", expected);
    expect(result).toBe(false);
  });

  it("returns false when grossAmount differs", () => {
    const serverKey = "SB-Mid-server-testkey";
    const expected = createHash("sha512")
      .update(`RIHLA-order-1${"200"}${"1500000"}${serverKey}`)
      .digest("hex");

    const result = verifyWebhookSignature("RIHLA-order-1", "200", "1600000", expected);
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests — isMidtransConfigured
// ---------------------------------------------------------------------------

describe("isMidtransConfigured", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when both keys are set (default mock)", async () => {
    // Ensure default mock is active after any prior test that used vi.doMock
    vi.resetModules();
    vi.doMock("@/env", () => ({
      env: {
        MIDTRANS_SERVER_KEY: "SB-Mid-server-testkey",
        MIDTRANS_CLIENT_KEY: "SB-Mid-client-testkey",
      },
    }));
    const mod = await import("../payment/midtrans");
    expect(mod.isMidtransConfigured()).toBe(true);
  });

  it("returns false when server key is missing", async () => {
    vi.resetModules();
    vi.doMock("@/env", () => ({
      env: {
        MIDTRANS_SERVER_KEY: undefined,
        MIDTRANS_CLIENT_KEY: "SB-Mid-client-key",
      },
    }));

    const mod = await import("../payment/midtrans");
    expect(mod.isMidtransConfigured()).toBe(false);
  });

  it("returns false when client key is missing", async () => {
    vi.resetModules();
    vi.doMock("@/env", () => ({
      env: {
        MIDTRANS_SERVER_KEY: "SB-Mid-server-key",
        MIDTRANS_CLIENT_KEY: undefined,
      },
    }));

    const mod = await import("../payment/midtrans");
    expect(mod.isMidtransConfigured()).toBe(false);
  });

  it("returns false when both keys are missing", async () => {
    vi.resetModules();
    vi.doMock("@/env", () => ({
      env: {
        MIDTRANS_SERVER_KEY: undefined,
        MIDTRANS_CLIENT_KEY: undefined,
      },
    }));

    const mod = await import("../payment/midtrans");
    expect(mod.isMidtransConfigured()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests — midtransRouter.createTransaction
// ---------------------------------------------------------------------------

describe("midtransRouter.createTransaction", () => {
  let db: DrizzleMockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    db = mockDb();
    mockSnapCreateTransaction.mockResolvedValue({
      token: "snap-token-txn",
      redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-txn",
    });
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
    const { midtransRouter } = await import("../trpc/routers/midtrans");
    const factory = createCallerFactory(midtransRouter);
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
    const { midtransRouter: unconfiguredRouter } = await import("../trpc/routers/midtrans");
    const callerFactory = createCallerFactory(unconfiguredRouter);
    const caller = callerFactory({
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
          email: "user@test.com",
          emailVerified: true,
          name: "User",
          role: "customer",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
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
    expect(mockSnapCreateTransaction).toHaveBeenCalledTimes(1);

    const snapCall = mockSnapCreateTransaction.mock.calls[0][0];
    expect(snapCall.transaction_details.order_id).toMatch(/^RIHLA-/);
    expect(snapCall.transaction_details.gross_amount).toBe(1500000);
    expect(snapCall.item_details[0].id).toBe(pkgId);
    expect(snapCall.item_details[0].name).toBe("Bali Adventure");
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
    const snapCall = mockSnapCreateTransaction.mock.calls[0][0];
    expect(snapCall.customer_details.email).toBe("");
    expect(snapCall.customer_details.phone).toBeUndefined();
  });

  it("propagates midtrans API errors", async () => {
    mockSnapCreateTransaction.mockRejectedValueOnce(new Error("Connection timeout"));
    const caller = await createCaller(db);

    vi.mocked(db.select).mockReturnValueOnce(db as never);
    vi.mocked(db.from).mockReturnValueOnce(db as never);
    vi.mocked(db.leftJoin).mockReturnValueOnce(db as never);
    vi.mocked(db.where).mockReturnValueOnce(db as never);
    vi.mocked(db.limit).mockResolvedValueOnce([pendingBooking] as never);

    await expect(caller.createTransaction({ bookingId })).rejects.toThrow("Connection timeout");
  });
});

// ---------------------------------------------------------------------------
// Tests — POST /api/midtrans/webhook
// ---------------------------------------------------------------------------

describe("POST /api/midtrans/webhook", () => {
  /**
   * Helper: build a mock NextRequest with a given JSON body string.
   */
  function mockRequest(body: string): {
    request: { text: ReturnType<typeof vi.fn> };
  } {
    return {
      request: {
        text: vi.fn().mockResolvedValue(body),
      },
    };
  }

  /**
   * Helper: build a valid notification payload as a JSON string.
   */
  function validNotificationJson(overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
      order_id: "RIHLA-order-webhook-1",
      transaction_status: "settlement",
      fraud_status: "accept",
      status_code: "200",
      gross_amount: "1500000",
      signature_key: "valid-signature-key",
      payment_type: "credit_card",
      transaction_id: "txn-mid-123",
      ...overrides,
    });
  }

  /**
   * Helper: setup mocks and dynamically import the webhook route.
   * Must call vi.doMock BEFORE vi.resetModules() and dynamic import.
   */
  async function setupWebhook(mocks: {
    db?: DrizzleMockInstance;
    verifySignature?: ReturnType<typeof vi.fn>;
  }) {
    const webhookDb = mocks.db ?? mockDb();
    const mockVerify = mocks.verifySignature ?? vi.fn().mockReturnValue(true);

    vi.doMock("@/lib/db/client", () => ({ db: webhookDb }));
    vi.doMock("@/lib/db/schema/bookings", () => ({
      bookings: {
        id: "bookings.id",
        midtransOrderId: "bookings.midtransOrderId",
        status: "bookings.status",
        paymentMethod: "bookings.paymentMethod",
        paymentChannel: "bookings.paymentChannel",
        grossAmount: "bookings.grossAmount",
        transactionStatus: "bookings.transactionStatus",
        midtransTransactionId: "bookings.midtransTransactionId",
      },
    }));
    vi.doMock("@/lib/payment/midtrans", () => ({
      verifyWebhookSignature: mockVerify,
    }));
    vi.doMock("@/lib/utils/logger", () => ({
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));
    vi.doMock("@/env", () => ({
      env: {
        MIDTRANS_SERVER_KEY: "SB-Mid-server-testkey",
        MIDTRANS_CLIENT_KEY: "SB-Mid-client-testkey",
      },
    }));
    vi.resetModules();

    const { POST } = await import("@/app/api/midtrans/webhook/route");

    return { POST, webhookDb, mockVerify };
  }

  it("returns 400 for invalid JSON body", async () => {
    const { POST } = await setupWebhook({});

    const { request } = mockRequest("not valid json {{{");
    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Invalid JSON" });
  });

  it("returns 400 for missing required fields", async () => {
    const { POST } = await setupWebhook({});

    const { request } = mockRequest(
      JSON.stringify({
        order_id: "RIHLA-order-1",
      }),
    );
    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Missing required fields" });
  });

  it("returns 401 for invalid signature", async () => {
    const mockVerify = vi.fn().mockReturnValue(false);
    const { POST } = await setupWebhook({ verifySignature: mockVerify });

    const { request } = mockRequest(validNotificationJson());
    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Invalid signature" });
    expect(mockVerify).toHaveBeenCalledWith(
      "RIHLA-order-webhook-1",
      "200",
      "1500000",
      "valid-signature-key",
    );
  });

  it("updates booking to 'paid' for settlement status", async () => {
    const webhookDb = mockDb();
    const { POST } = await setupWebhook({ db: webhookDb });

    vi.mocked(webhookDb.update).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.set).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.where).mockResolvedValueOnce(undefined as never);

    const { request } = mockRequest(
      validNotificationJson({
        transaction_status: "settlement",
      }),
    );
    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok" });

    expect(vi.mocked(webhookDb.set)).toHaveBeenCalledWith(
      expect.objectContaining({ status: "paid" }),
    );
  });

  it("updates booking to 'paid' for capture+accept status", async () => {
    const webhookDb = mockDb();
    const { POST } = await setupWebhook({ db: webhookDb });

    vi.mocked(webhookDb.update).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.set).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.where).mockResolvedValueOnce(undefined as never);

    const { request } = mockRequest(
      validNotificationJson({
        transaction_status: "capture",
        fraud_status: "accept",
      }),
    );
    const response = await POST(request as never);
    await response.json();

    expect(response.status).toBe(200);
    expect(vi.mocked(webhookDb.set)).toHaveBeenCalledWith(
      expect.objectContaining({ status: "paid" }),
    );
  });

  it("keeps booking 'pending' for capture+challenge status", async () => {
    const webhookDb = mockDb();
    const { POST } = await setupWebhook({ db: webhookDb });

    vi.mocked(webhookDb.update).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.set).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.where).mockResolvedValueOnce(undefined as never);

    const { request } = mockRequest(
      validNotificationJson({
        transaction_status: "capture",
        fraud_status: "challenge",
      }),
    );
    const response = await POST(request as never);
    await response.json();

    expect(vi.mocked(webhookDb.set)).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" }),
    );
  });

  it("keeps booking 'pending' for capture+deny status", async () => {
    const webhookDb = mockDb();
    const { POST } = await setupWebhook({ db: webhookDb });

    vi.mocked(webhookDb.update).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.set).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.where).mockResolvedValueOnce(undefined as never);

    const { request } = mockRequest(
      validNotificationJson({
        transaction_status: "capture",
        fraud_status: "deny",
      }),
    );
    const response = await POST(request as never);
    await response.json();

    expect(vi.mocked(webhookDb.set)).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" }),
    );
  });

  it("updates booking to 'cancelled' for cancel status", async () => {
    const webhookDb = mockDb();
    const { POST } = await setupWebhook({ db: webhookDb });

    vi.mocked(webhookDb.update).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.set).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.where).mockResolvedValueOnce(undefined as never);

    const { request } = mockRequest(
      validNotificationJson({
        transaction_status: "cancel",
      }),
    );
    const response = await POST(request as never);
    await response.json();

    expect(vi.mocked(webhookDb.set)).toHaveBeenCalledWith(
      expect.objectContaining({ status: "cancelled" }),
    );
  });

  it("updates booking to 'cancelled' for expire status", async () => {
    const webhookDb = mockDb();
    const { POST } = await setupWebhook({ db: webhookDb });

    vi.mocked(webhookDb.update).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.set).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.where).mockResolvedValueOnce(undefined as never);

    const { request } = mockRequest(
      validNotificationJson({
        transaction_status: "expire",
      }),
    );
    const response = await POST(request as never);
    await response.json();

    expect(vi.mocked(webhookDb.set)).toHaveBeenCalledWith(
      expect.objectContaining({ status: "cancelled" }),
    );
  });

  it("updates booking to 'cancelled' for deny status", async () => {
    const webhookDb = mockDb();
    const { POST } = await setupWebhook({ db: webhookDb });

    vi.mocked(webhookDb.update).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.set).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.where).mockResolvedValueOnce(undefined as never);

    const { request } = mockRequest(
      validNotificationJson({
        transaction_status: "deny",
      }),
    );
    const response = await POST(request as never);
    await response.json();

    expect(vi.mocked(webhookDb.set)).toHaveBeenCalledWith(
      expect.objectContaining({ status: "cancelled" }),
    );
  });

  it("keeps booking 'pending' for pending status", async () => {
    const webhookDb = mockDb();
    const { POST } = await setupWebhook({ db: webhookDb });

    vi.mocked(webhookDb.update).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.set).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.where).mockResolvedValueOnce(undefined as never);

    const { request } = mockRequest(
      validNotificationJson({
        transaction_status: "pending",
      }),
    );
    const response = await POST(request as never);
    await response.json();

    expect(vi.mocked(webhookDb.set)).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" }),
    );
  });

  it("returns ok without updating for unhandled statuses", async () => {
    const webhookDb = mockDb();
    const { POST } = await setupWebhook({ db: webhookDb });

    const { request } = mockRequest(
      validNotificationJson({
        transaction_status: "refund",
      }),
    );
    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok" });
    expect(webhookDb.update).not.toHaveBeenCalled();
  });

  it("stores payment metadata on the booking record", async () => {
    const webhookDb = mockDb();
    const { POST } = await setupWebhook({ db: webhookDb });

    vi.mocked(webhookDb.update).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.set).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.where).mockResolvedValueOnce(undefined as never);

    const { request } = mockRequest(
      validNotificationJson({
        transaction_status: "settlement",
        payment_type: "gopay",
        transaction_id: "txn-gopay-456",
      }),
    );
    const response = await POST(request as never);
    await response.json();

    expect(vi.mocked(webhookDb.set)).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethod: "gopay",
        midtransTransactionId: "txn-gopay-456",
        transactionStatus: "settlement",
        grossAmount: "1500000",
      }),
    );
  });

  it("handles null payment_type and transaction_id gracefully", async () => {
    const webhookDb = mockDb();
    const { POST } = await setupWebhook({ db: webhookDb });

    vi.mocked(webhookDb.update).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.set).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.where).mockResolvedValueOnce(undefined as never);

    const payload = JSON.stringify({
      order_id: "RIHLA-order-null-meta",
      transaction_status: "settlement",
      fraud_status: "accept",
      status_code: "200",
      gross_amount: "750000",
      signature_key: "valid-signature-key",
    });

    const { request } = mockRequest(payload);
    const response = await POST(request as never);
    await response.json();

    expect(vi.mocked(webhookDb.set)).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethod: null,
        midtransTransactionId: null,
      }),
    );
  });

  it("returns 500 when db update throws", async () => {
    const webhookDb = mockDb();
    const { POST } = await setupWebhook({ db: webhookDb });

    vi.mocked(webhookDb.update).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.set).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.where).mockRejectedValueOnce(new Error("DB connection lost"));

    const { request } = mockRequest(
      validNotificationJson({
        transaction_status: "settlement",
      }),
    );
    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Internal server error" });
  });
});
