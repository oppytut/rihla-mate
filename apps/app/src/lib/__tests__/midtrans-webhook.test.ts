import { describe, it, expect, beforeEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock definitions
// ---------------------------------------------------------------------------

vi.mock("@/lib/payment/midtrans", () => ({
  verifyWebhookSignature: vi.fn(),
}));

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

vi.mock("@/env", () => ({
  env: {
    MIDTRANS_SERVER_KEY: "SB-Mid-server-testkey",
    MIDTRANS_CLIENT_KEY: "SB-Mid-client-testkey",
  },
}));

// ---------------------------------------------------------------------------
// Chainable DB mock (mirrors pattern from bookings.test.ts)
// ---------------------------------------------------------------------------

type DrizzleMock = {
  select: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  offset: ReturnType<typeof vi.fn>;
  leftJoin: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  values: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
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
// Helpers
// ---------------------------------------------------------------------------

function mockRequest(body: string): {
  request: { text: ReturnType<typeof vi.fn> };
} {
  return {
    request: {
      text: vi.fn().mockResolvedValue(body),
    },
  };
}

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
 * Dynamically imports the webhook POST handler with all mocks wired up.
 * Uses vi.doMock + vi.resetModules so the webhook module sees our mocks.
 */
async function setupWebhook(mocks: {
  db?: DrizzleMockInstance;
  verifySignature?: ReturnType<typeof vi.fn>;
}) {
  const webhookDb = mocks.db ?? mockDb();
  const mockVerify = mocks.verifySignature ?? vi.fn().mockReturnValue(true);

  vi.doMock("@/lib/db/client", () => ({ db: webhookDb }));
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/midtrans/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- 1. Invalid JSON body ---

  it("returns 400 for invalid JSON body", async () => {
    const { POST } = await setupWebhook({});

    const { request } = mockRequest("not valid json {{{");
    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Invalid JSON" });
  });

  // --- 2. Missing required fields ---

  it("returns 400 for missing required fields (order_id, transaction_status, status_code, gross_amount, signature_key)", async () => {
    const { POST } = await setupWebhook({});

    // Missing all but order_id
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

  it("returns 400 when order_id is missing", async () => {
    const { POST } = await setupWebhook({});

    const { request } = mockRequest(
      JSON.stringify({
        transaction_status: "settlement",
        status_code: "200",
        gross_amount: "1500000",
        signature_key: "sig",
      }),
    );
    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Missing required fields" });
  });

  it("returns 400 when transaction_status is missing", async () => {
    const { POST } = await setupWebhook({});

    const { request } = mockRequest(
      JSON.stringify({
        order_id: "RIHLA-order-1",
        status_code: "200",
        gross_amount: "1500000",
        signature_key: "sig",
      }),
    );
    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Missing required fields" });
  });

  // --- 3. Invalid webhook signature ---

  it("returns 401 for invalid webhook signature", async () => {
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

  // --- 4. Settlement → paid ---

  it("returns 200 and updates booking to 'paid' for settlement transaction status", async () => {
    const webhookDb = mockDb();
    const { POST } = await setupWebhook({ db: webhookDb });

    vi.mocked(webhookDb.update).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.set).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.where).mockResolvedValueOnce(undefined as never);

    const { request } = mockRequest(validNotificationJson({ transaction_status: "settlement" }));
    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok" });
    expect(vi.mocked(webhookDb.set)).toHaveBeenCalledWith(
      expect.objectContaining({ status: "paid" }),
    );
  });

  // --- 5. Capture + fraud accept → paid ---

  it("returns 200 and updates booking to 'paid' for capture + fraud accept", async () => {
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
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok" });
    expect(vi.mocked(webhookDb.set)).toHaveBeenCalledWith(
      expect.objectContaining({ status: "paid" }),
    );
  });

  // --- 6. Capture + fraud challenge → pending ---

  it("returns 200 and updates booking to 'pending' for capture + fraud challenge", async () => {
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
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok" });
    expect(vi.mocked(webhookDb.set)).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" }),
    );
  });

  // --- 7. Cancel/expire/deny → cancelled ---

  it("returns 200 and updates booking to 'cancelled' for cancel transaction status", async () => {
    const webhookDb = mockDb();
    const { POST } = await setupWebhook({ db: webhookDb });

    vi.mocked(webhookDb.update).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.set).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.where).mockResolvedValueOnce(undefined as never);

    const { request } = mockRequest(validNotificationJson({ transaction_status: "cancel" }));
    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok" });
    expect(vi.mocked(webhookDb.set)).toHaveBeenCalledWith(
      expect.objectContaining({ status: "cancelled" }),
    );
  });

  it("returns 200 and updates booking to 'cancelled' for expire transaction status", async () => {
    const webhookDb = mockDb();
    const { POST } = await setupWebhook({ db: webhookDb });

    vi.mocked(webhookDb.update).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.set).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.where).mockResolvedValueOnce(undefined as never);

    const { request } = mockRequest(validNotificationJson({ transaction_status: "expire" }));
    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok" });
    expect(vi.mocked(webhookDb.set)).toHaveBeenCalledWith(
      expect.objectContaining({ status: "cancelled" }),
    );
  });

  it("returns 200 and updates booking to 'cancelled' for deny transaction status", async () => {
    const webhookDb = mockDb();
    const { POST } = await setupWebhook({ db: webhookDb });

    vi.mocked(webhookDb.update).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.set).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.where).mockResolvedValueOnce(undefined as never);

    const { request } = mockRequest(validNotificationJson({ transaction_status: "deny" }));
    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok" });
    expect(vi.mocked(webhookDb.set)).toHaveBeenCalledWith(
      expect.objectContaining({ status: "cancelled" }),
    );
  });

  // --- 8. Pending → pending ---

  it("returns 200 and updates booking to 'pending' for pending transaction status", async () => {
    const webhookDb = mockDb();
    const { POST } = await setupWebhook({ db: webhookDb });

    vi.mocked(webhookDb.update).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.set).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.where).mockResolvedValueOnce(undefined as never);

    const { request } = mockRequest(validNotificationJson({ transaction_status: "pending" }));
    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok" });
    expect(vi.mocked(webhookDb.set)).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" }),
    );
  });

  // --- 9. Unhandled statuses (refund, partial_refund) → no status change ---

  it("returns 200 (no status change) for unhandled transaction status 'refund'", async () => {
    const webhookDb = mockDb();
    const { POST } = await setupWebhook({ db: webhookDb });

    const { request } = mockRequest(validNotificationJson({ transaction_status: "refund" }));
    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok" });
    expect(webhookDb.update).not.toHaveBeenCalled();
  });

  it("returns 200 (no status change) for unhandled transaction status 'partial_refund'", async () => {
    const webhookDb = mockDb();
    const { POST } = await setupWebhook({ db: webhookDb });

    const { request } = mockRequest(
      validNotificationJson({ transaction_status: "partial_refund" }),
    );
    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: "ok" });
    expect(webhookDb.update).not.toHaveBeenCalled();
  });

  // --- 10. DB throws → 500 ---

  it("returns 500 for unexpected errors (db throws)", async () => {
    const webhookDb = mockDb();
    const { POST } = await setupWebhook({ db: webhookDb });

    vi.mocked(webhookDb.update).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.set).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.where).mockRejectedValueOnce(new Error("DB connection lost"));

    const { request } = mockRequest(validNotificationJson({ transaction_status: "settlement" }));
    const response = await POST(request as never);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "Internal server error" });
  });

  // --- 11. Idempotency ---

  it("is idempotent: calling twice with the same notification does not fail", async () => {
    const webhookDb = mockDb();
    const { POST } = await setupWebhook({ db: webhookDb });

    // First call
    vi.mocked(webhookDb.update).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.set).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.where).mockResolvedValueOnce(undefined as never);

    const { request: req1 } = mockRequest(validNotificationJson());
    const response1 = await POST(req1 as never);
    const body1 = await response1.json();

    expect(response1.status).toBe(200);
    expect(body1).toEqual({ status: "ok" });

    // Second call with same payload — idempotent
    vi.mocked(webhookDb.update).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.set).mockReturnValueOnce(webhookDb as never);
    vi.mocked(webhookDb.where).mockResolvedValueOnce(undefined as never);

    const { request: req2 } = mockRequest(validNotificationJson());
    const response2 = await POST(req2 as never);
    const body2 = await response2.json();

    expect(response2.status).toBe(200);
    expect(body2).toEqual({ status: "ok" });

    // Both calls should have triggered the same db.set with "paid" status
    const setCalls = vi.mocked(webhookDb.set).mock.calls;
    expect(setCalls).toHaveLength(2);
    expect(setCalls[0]).toEqual([expect.objectContaining({ status: "paid" })]);
    expect(setCalls[1]).toEqual([expect.objectContaining({ status: "paid" })]);
  });
});
