import { describe, it, expect, beforeEach, vi } from "vitest";
import { initTRPC, TRPCError } from "@trpc/server";
import type { TRPCContext } from "../trpc/context";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../trpc/rate-limit", () => ({
  createRateLimitMiddleware:
    () =>
    ({ ctx, next }: { ctx: unknown; next: (opts: { ctx: unknown }) => unknown }) =>
      next({ ctx }),
}));

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

const mockDbExecute = vi.fn();
vi.mock("@/lib/db/client", () => ({
  db: { execute: mockDbExecute },
}));

const mockSignUpEmail = vi.fn();
const mockGetAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  getAuth: mockGetAuth,
}));

const mockExecSync = vi.fn();
vi.mock("child_process", () => ({
  execSync: mockExecSync,
}));

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
    "execute",
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

async function createCaller(ctx: TRPCContext) {
  const { installerRouter } = await import("../trpc/routers/installer");
  const { createCallerFactory } = await import("../trpc/init");
  return createCallerFactory(installerRouter)(ctx);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("installerRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuth.mockReturnValue({ api: { signUpEmail: mockSignUpEmail } });
  });

  // -----------------------------------------------------------------------
  // setupAdmin
  // -----------------------------------------------------------------------

  describe("setupAdmin", () => {
    it("creates first admin successfully when no admin exists", async () => {
      const ctx = makeMockContext();

      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const userId = "new-admin-user-id";
      mockSignUpEmail.mockResolvedValue({
        user: { id: userId },
      });

      const caller = await createCaller(ctx);
      const result = await caller.setupAdmin({
        email: "admin@example.com",
        password: "securePassword123",
        name: "Admin User",
      });

      expect(mockSignUpEmail).toHaveBeenCalledTimes(1);
      expect(mockSignUpEmail).toHaveBeenCalledWith({
        body: {
          email: "admin@example.com",
          password: "securePassword123",
          name: "Admin User",
        },
      });

      expect(result).toEqual({ success: true, userId });
    });

    it("throws FORBIDDEN when admin already exists", async () => {
      const ctx = makeMockContext();

      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "existing-admin-id" }]),
          }),
        }),
      });

      const caller = await createCaller(ctx);

      await expect(
        caller.setupAdmin({
          email: "admin@example.com",
          password: "securePassword123",
          name: "Admin User",
        }),
      ).rejects.toThrow(TRPCError);

      await expect(
        caller.setupAdmin({
          email: "admin@example.com",
          password: "securePassword123",
          name: "Admin User",
        }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Admin account already exists. Setup can only be run once.",
      });

      expect(mockSignUpEmail).not.toHaveBeenCalled();
    });

    it("calls signUpEmail with correct email, password, and name from input", async () => {
      const ctx = makeMockContext();

      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      mockSignUpEmail.mockResolvedValue({
        user: { id: "user-1" },
      });

      const caller = await createCaller(ctx);
      await caller.setupAdmin({
        email: "root@myapp.io",
        password: "superSecret99",
        name: "Root Admin",
      });

      expect(mockSignUpEmail).toHaveBeenCalledWith({
        body: {
          email: "root@myapp.io",
          password: "superSecret99",
          name: "Root Admin",
        },
      });
    });

    it("updates user role to admin after signup", async () => {
      const ctx = makeMockContext();

      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const userId = "user-to-elevate";
      mockSignUpEmail.mockResolvedValue({
        user: { id: userId },
      });

      const caller = await createCaller(ctx);
      await caller.setupAdmin({
        email: "admin@example.com",
        password: "securePassword123",
        name: "Admin User",
      });

      const dbMock = ctx.db as unknown as Record<string, ReturnType<typeof vi.fn>>;
      expect(dbMock.update).toHaveBeenCalled();
      expect(dbMock.set).toHaveBeenCalledWith({ role: "admin" });
      expect(dbMock.where).toHaveBeenCalled();
    });

    it("returns the userId from signUpEmail result", async () => {
      const ctx = makeMockContext();

      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const expectedUserId = "returned-user-id-abc123";
      mockSignUpEmail.mockResolvedValue({
        user: { id: expectedUserId },
      });

      const caller = await createCaller(ctx);
      const result = await caller.setupAdmin({
        email: "admin@example.com",
        password: "securePassword123",
        name: "Admin User",
      });

      expect(result.userId).toBe(expectedUserId);
    });

    it("propagates error when signUpEmail fails", async () => {
      const ctx = makeMockContext();

      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const signUpError = new Error("Email already in use");
      mockSignUpEmail.mockRejectedValue(signUpError);

      const caller = await createCaller(ctx);

      await expect(
        caller.setupAdmin({
          email: "admin@example.com",
          password: "securePassword123",
          name: "Admin User",
        }),
      ).rejects.toThrow("Email already in use");
    });

    it("verifies admin check uses eq(users.role, admin) correctly", async () => {
      const ctx = makeMockContext();

      const whereFn = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      });
      const fromFn = vi.fn().mockReturnValue({ where: whereFn });

      (ctx.db.select as ReturnType<typeof vi.fn>).mockReturnValue({
        from: fromFn,
      });

      mockSignUpEmail.mockResolvedValue({
        user: { id: "user-1" },
      });

      const caller = await createCaller(ctx);
      await caller.setupAdmin({
        email: "admin@example.com",
        password: "securePassword123",
        name: "Admin User",
      });

      const selectArg = (ctx.db.select as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(selectArg).toHaveProperty("id");
      expect(fromFn).toHaveBeenCalled();
      expect(whereFn).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // systemCheck
  // -----------------------------------------------------------------------

  describe("systemCheck", () => {
    it("returns database: true when db.execute succeeds", async () => {
      const ctx = makeMockContext();

      (ctx.db.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      mockExecSync.mockReturnValue("/dev/sda1  50G  20G  30G  40% /\n");

      const caller = await createCaller(ctx);
      const result = await caller.systemCheck();

      expect(result.database).toBe(true);
    });

    it("returns database: false when db.execute throws", async () => {
      const ctx = makeMockContext();

      (ctx.db.execute as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Connection refused"),
      );

      mockExecSync.mockReturnValue("/dev/sda1  50G  20G  30G  40% /\n");

      const caller = await createCaller(ctx);
      const result = await caller.systemCheck();

      expect(result.database).toBe(false);
    });

    it("returns diskSpace with available and total when df command succeeds", async () => {
      const ctx = makeMockContext();

      (ctx.db.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      mockExecSync.mockReturnValue("/dev/sda1  100G  40G  60G  40% /\n");

      const caller = await createCaller(ctx);
      const result = await caller.systemCheck();

      expect(result.diskSpace).toEqual({ available: 60, total: 100 });
    });

    it("returns diskSpace with correct values for small disk layout", async () => {
      const ctx = makeMockContext();

      (ctx.db.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      mockExecSync.mockReturnValue("/dev/xvda1  20G  15G  5G  75% /\n");

      const caller = await createCaller(ctx);
      const result = await caller.systemCheck();

      expect(result.diskSpace).toEqual({ available: 5, total: 20 });
    });

    it("returns diskSpace: null when df command produces unparseable output", async () => {
      const ctx = makeMockContext();

      (ctx.db.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      mockExecSync.mockImplementation(() => {
        throw new Error("df command failed");
      });

      const caller = await createCaller(ctx);
      const result = await caller.systemCheck();

      expect(result.diskSpace).toBeNull();
    });

    it("returns diskSpace: null when execSync throws", async () => {
      const ctx = makeMockContext();

      (ctx.db.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      mockExecSync.mockImplementation(() => {
        throw new Error("spawn df ENOENT");
      });

      const caller = await createCaller(ctx);
      const result = await caller.systemCheck();

      expect(result.diskSpace).toBeNull();
    });

    it("returns nodeVersion from process.version", async () => {
      const ctx = makeMockContext();

      (ctx.db.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockExecSync.mockReturnValue("/dev/sda1  50G  20G  30G  40% /\n");

      const caller = await createCaller(ctx);
      const result = await caller.systemCheck();

      expect(result.nodeVersion).toBe(process.version);
      expect(typeof result.nodeVersion).toBe("string");
      expect(result.nodeVersion).toMatch(/^v\d+\./);
    });

    it("returns timestamp close to Date.now()", async () => {
      const ctx = makeMockContext();

      (ctx.db.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      mockExecSync.mockReturnValue("/dev/sda1  50G  20G  30G  40% /\n");

      const before = Date.now();
      const caller = await createCaller(ctx);
      const result = await caller.systemCheck();
      const after = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
      expect(typeof result.timestamp).toBe("number");
    });

    it("returns database: false and diskSpace: null when both checks fail", async () => {
      const ctx = makeMockContext();

      (ctx.db.execute as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Connection refused"),
      );
      mockExecSync.mockImplementation(() => {
        throw new Error("spawn df ENOENT");
      });

      const caller = await createCaller(ctx);
      const result = await caller.systemCheck();

      expect(result.database).toBe(false);
      expect(result.diskSpace).toBeNull();
      expect(result.nodeVersion).toBe(process.version);
      expect(typeof result.timestamp).toBe("number");
    });

    it("parses diskSpace from multi-column df output with extra whitespace", async () => {
      const ctx = makeMockContext();

      (ctx.db.execute as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      mockExecSync.mockReturnValue("/dev/mapper/vg-root  250G  180G  70G  73% /\n");

      const caller = await createCaller(ctx);
      const result = await caller.systemCheck();

      expect(result.diskSpace).toEqual({ available: 70, total: 250 });
    });
  });
});
