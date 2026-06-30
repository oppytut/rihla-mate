import { describe, it, expect, beforeEach, vi } from "vitest";
import { initTRPC, TRPCError } from "@trpc/server";
import type { TRPCContext, Session } from "../trpc/context";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock the rate-limit middleware so protectedProcedure is a plain passthrough
// (no IP extraction, no rate-limiting logic).
vi.mock("../trpc/rate-limit", () => ({
  createRateLimitMiddleware:
    () =>
    ({ ctx, next }: { ctx: unknown; next: (opts: { ctx: unknown }) => unknown }) =>
      next({ ctx }),
}));

// Provide a real tRPC instance with minimal configuration so the router file
// can build its procedures correctly.  The protectedProcedure must enforce
// auth – throw UNAUTHORIZED when session is null, passthrough otherwise.
vi.mock("../trpc/init", async () => {
  const t = initTRPC.context<TRPCContext>().create({
    transformer: { serialize: (v: unknown) => v, deserialize: (v: unknown) => v },
    errorFormatter: ({ shape }) => shape,
  });

  const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
    if (!ctx.session) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({ ctx: { ...ctx, session: ctx.session } });
  });

  return {
    createTRPCRouter: t.router,
    createCallerFactory: t.createCallerFactory,
    publicProcedure: t.procedure,
    protectedProcedure,
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

const { userRouter } = await import("../trpc/routers/user");

describe("userRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // me
  // -----------------------------------------------------------------------

  describe("me", () => {
    it("returns the user when a session exists", async () => {
      const mockUser: Session["user"] = {
        id: "user-1",
        email: "alice@example.com",
        emailVerified: true,
        name: "Alice",
        role: "user",
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-06-01"),
      };

      const ctx = makeMockContext({
        session: {
          session: {
            id: "sess-1",
            userId: "user-1",
            expiresAt: new Date("2026-01-01"),
            token: "tok-abc",
            ipAddress: null,
            userAgent: null,
            createdAt: new Date("2025-01-01"),
            updatedAt: new Date("2025-06-01"),
          },
          user: mockUser,
        },
      });

      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(userRouter)(ctx);

      const result = await caller.me();

      expect(result).toEqual({ user: mockUser });
    });

    it("throws UNAUTHORIZED when session is null", async () => {
      const ctx = makeMockContext(); // session defaults to null

      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(userRouter)(ctx);

      await expect(caller.me()).rejects.toThrow(TRPCError);
      await expect(caller.me()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("returns the correct user shape (id, email, name, role)", async () => {
      const mockUser: Session["user"] = {
        id: "user-2",
        email: "bob@example.com",
        emailVerified: true,
        name: "Bob",
        role: "admin",
        createdAt: new Date("2025-02-01"),
        updatedAt: new Date("2025-06-15"),
      };

      const ctx = makeMockContext({
        session: {
          session: {
            id: "sess-2",
            userId: "user-2",
            expiresAt: new Date("2026-02-01"),
            token: "tok-def",
            ipAddress: null,
            userAgent: null,
            createdAt: new Date("2025-02-01"),
            updatedAt: new Date("2025-06-15"),
          },
          user: mockUser,
        },
      });

      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(userRouter)(ctx);

      const result = await caller.me();

      expect(result).toEqual({ user: mockUser });
      expect(result.user).toHaveProperty("id");
      expect(result.user).toHaveProperty("email");
      expect(result.user).toHaveProperty("name");
      expect(result.user).toHaveProperty("role");
    });

    it("returns the user with the role field correctly", async () => {
      const mockUser: Session["user"] = {
        id: "user-3",
        email: "carol@example.com",
        emailVerified: true,
        name: "Carol",
        role: "admin",
        createdAt: new Date("2025-03-01"),
        updatedAt: new Date("2025-07-01"),
      };

      const ctx = makeMockContext({
        session: {
          session: {
            id: "sess-3",
            userId: "user-3",
            expiresAt: new Date("2026-03-01"),
            token: "tok-ghi",
            ipAddress: null,
            userAgent: null,
            createdAt: new Date("2025-03-01"),
            updatedAt: new Date("2025-07-01"),
          },
          user: mockUser,
        },
      });

      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(userRouter)(ctx);

      const result = await caller.me();

      expect(result.user.role).toBe("admin");
    });

    it("returns the user with a non-admin role correctly", async () => {
      const mockUser: Session["user"] = {
        id: "user-4",
        email: "dave@example.com",
        emailVerified: true,
        name: "Dave",
        role: "user",
        createdAt: new Date("2025-04-01"),
        updatedAt: new Date("2025-08-01"),
      };

      const ctx = makeMockContext({
        session: {
          session: {
            id: "sess-4",
            userId: "user-4",
            expiresAt: new Date("2026-04-01"),
            token: "tok-jkl",
            ipAddress: null,
            userAgent: null,
            createdAt: new Date("2025-04-01"),
            updatedAt: new Date("2025-08-01"),
          },
          user: mockUser,
        },
      });

      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(userRouter)(ctx);

      const result = await caller.me();

      expect(result.user.role).toBe("user");
    });
  });
});
