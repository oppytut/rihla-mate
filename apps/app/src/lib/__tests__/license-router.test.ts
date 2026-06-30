import { describe, it, expect, beforeEach, vi } from "vitest";
import { initTRPC, TRPCError } from "@trpc/server";
import type { TRPCContext } from "../trpc/context";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockStartTrial = vi.fn();
const mockCheckIn = vi.fn();
const mockInvalidateLicenseCache = vi.fn();

vi.mock("../license/trial", () => ({
  startTrial: mockStartTrial,
}));

vi.mock("../license/checkin", () => ({
  checkIn: mockCheckIn,
}));

vi.mock("../license/store", async (importOriginal) => {
  const mod = (await importOriginal()) as Record<string, unknown>;
  return {
    ...mod,
    invalidateLicenseCache: mockInvalidateLicenseCache,
  };
});

// Mock the rate-limit middleware so publicProcedure is a plain passthrough
// (no IP extraction, no rate-limiting logic).
vi.mock("../trpc/rate-limit", () => ({
  createRateLimitMiddleware:
    () =>
    ({ ctx, next }: { ctx: unknown; next: (opts: { ctx: unknown }) => unknown }) =>
      next({ ctx }),
}));

// Provide a real tRPC instance with minimal configuration so the router file
// can build its procedures correctly.
vi.mock("../trpc/init", async () => {
  const t = initTRPC.context<TRPCContext>().create({
    transformer: { serialize: (v: unknown) => v, deserialize: (v: unknown) => v },
    errorFormatter: ({ shape }) => shape,
  });
  return {
    createTRPCRouter: t.router,
    createCallerFactory: t.createCallerFactory,
    publicProcedure: t.procedure,
  };
});

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeMockDb(): TRPCContext["db"] {
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

  return db as unknown as TRPCContext["db"];
}

function makeMockContext(overrides?: Partial<TRPCContext>): TRPCContext {
  return {
    headers: new Headers(),
    db: makeMockDb(),
    session: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const { licenseRouter } = await import("../trpc/routers/license");

describe("licenseRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // startTrial
  // -----------------------------------------------------------------------

  describe("startTrial", () => {
    it("throws CONFLICT when instanceId already has an active trial", async () => {
      const ctx = makeMockContext();
      // Simulate an existing trial row in the database.
      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "existing-trial-id" }]),
          }),
        }),
      });

      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(licenseRouter)(ctx);

      await expect(caller.startTrial({ instanceId: "i-abc" })).rejects.toThrow(TRPCError);

      await expect(caller.startTrial({ instanceId: "i-abc" })).rejects.toMatchObject({
        code: "CONFLICT",
        message: "You already have an active trial",
      });
    });

    it("calls startTrial and invalidateLicenseCache on success", async () => {
      const ctx = makeMockContext();
      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const testKey = "RM-TEST-0000-0000-0001";
      mockStartTrial.mockResolvedValue(testKey);

      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(licenseRouter)(ctx);

      const result = await caller.startTrial({ instanceId: "i-def" });

      expect(mockStartTrial).toHaveBeenCalledTimes(1);
      expect(mockStartTrial).toHaveBeenCalledWith(ctx.db, {
        instanceId: "i-def",
        ipAddress: "unknown",
      });
      expect(mockInvalidateLicenseCache).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ key: testKey });
    });

    it("passes the x-forwarded-for IP to startTrial when present", async () => {
      const headers = new Headers();
      headers.set("x-forwarded-for", "203.0.113.42");
      const ctx = makeMockContext({ headers });

      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const testKey = "RM-TEST-0000-0000-0002";
      mockStartTrial.mockResolvedValue(testKey);

      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(licenseRouter)(ctx);

      await caller.startTrial({ instanceId: "i-ghi" });

      expect(mockStartTrial).toHaveBeenCalledWith(ctx.db, {
        instanceId: "i-ghi",
        ipAddress: "203.0.113.42",
      });
    });

    it("returns the generated key", async () => {
      const ctx = makeMockContext();
      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const testKey = "RM-ABCD-1234-5678-EF01";
      mockStartTrial.mockResolvedValue(testKey);

      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(licenseRouter)(ctx);

      const result = await caller.startTrial({ instanceId: "i-jkl" });

      expect(result).toEqual({ key: testKey });
    });
  });

  // -----------------------------------------------------------------------
  // activate
  // -----------------------------------------------------------------------

  describe("activate", () => {
    it("returns result when checkIn returns valid", async () => {
      const ctx = makeMockContext();
      const validResult = {
        valid: true as const,
        expiresAt: new Date("2027-06-29"),
        seats: 5,
        plan: "enterprise" as const,
      };
      mockCheckIn.mockResolvedValue(validResult);

      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(licenseRouter)(ctx);

      const result = await caller.activate({ licenseKey: "RM-KEY-VALID-1234" });

      expect(mockCheckIn).toHaveBeenCalledTimes(1);
      expect(mockCheckIn).toHaveBeenCalledWith(ctx.db, "RM-KEY-VALID-1234");
      expect(result).toEqual(validResult);
    });

    it("throws BAD_REQUEST when checkIn returns invalid", async () => {
      const ctx = makeMockContext();
      mockCheckIn.mockResolvedValue({ valid: false as const });

      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(licenseRouter)(ctx);

      await expect(caller.activate({ licenseKey: "RM-KEY-BAD" })).rejects.toThrow(TRPCError);

      await expect(caller.activate({ licenseKey: "RM-KEY-BAD" })).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });

    it("throws BAD_REQUEST with reason message when checkIn provides one", async () => {
      const ctx = makeMockContext();
      mockCheckIn.mockResolvedValue({
        valid: false as const,
        reason: "License has been revoked",
      });

      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(licenseRouter)(ctx);

      await expect(caller.activate({ licenseKey: "RM-KEY-REVOKED" })).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "License has been revoked",
      });
    });

    it("throws BAD_REQUEST with default message when checkIn has no reason", async () => {
      const ctx = makeMockContext();
      mockCheckIn.mockResolvedValue({ valid: false as const });

      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(licenseRouter)(ctx);

      await expect(caller.activate({ licenseKey: "RM-KEY-UNKNOWN" })).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "Invalid license key",
      });
    });

    it("throws BAD_REQUEST when checkIn returns valid=false with an empty reason string", async () => {
      // Empty string is not nullish, so `??` won't fall back. The empty string
      // is used as-is, which still results in a BAD_REQUEST error.
      const ctx = makeMockContext();
      mockCheckIn.mockResolvedValue({ valid: false as const, reason: "" });

      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(licenseRouter)(ctx);

      await expect(caller.activate({ licenseKey: "RM-KEY-EMPTY-REASON" })).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "",
      });
    });

    it("calls checkIn with the provided license key", async () => {
      const ctx = makeMockContext();
      mockCheckIn.mockResolvedValue({
        valid: true as const,
        plan: "pro",
      });

      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(licenseRouter)(ctx);

      await caller.activate({ licenseKey: "RM-KEY-CUSTOM-ABCD" });

      expect(mockCheckIn).toHaveBeenCalledWith(ctx.db, "RM-KEY-CUSTOM-ABCD");
    });
  });
});
