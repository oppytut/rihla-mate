import { describe, it, expect, beforeEach, vi } from "vitest";
import { initTRPC, TRPCError } from "@trpc/server";
import type { TRPCContext, Session } from "../trpc/context";

vi.mock("../trpc/rate-limit", () => ({
  createRateLimitMiddleware:
    () =>
    ({ ctx, next }: { ctx: unknown; next: (opts: { ctx: unknown }) => unknown }) =>
      next({ ctx }),
}));

const mockRequestPasswordReset = vi.fn(async () => ({ status: true }));
const mockSignUpEmail = vi.fn(async ({ body }: { body: { email: string; name: string } }) => ({
  user: {
    id: "new-user-id",
    email: body.email,
    name: body.name,
  },
}));

vi.mock("../auth", () => ({
  getOrInitAuth: vi.fn(async () => ({
    api: {
      signUpEmail: mockSignUpEmail,
      requestPasswordReset: mockRequestPasswordReset,
    },
  })),
}));

vi.mock("../email/password-email-kind", () => ({
  withPasswordEmailKind: async (_kind: string, fn: () => Promise<unknown>) => fn(),
  withInvitePasswordEmail: async (_cookie: string | null, fn: () => Promise<unknown>) => fn(),
  getPasswordEmailKind: () => "reset",
  getPasswordEmailLocale: () => null,
  normalizeAppLocale: (v: string | null | undefined) =>
    v === "en" || v === "ar" || v === "id" ? v : "id",
}));

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

  const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
    if (!ctx.session) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    if (ctx.session.user.role !== "admin" && ctx.session.user.role !== "owner") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next({ ctx: { ...ctx, session: ctx.session } });
  });

  return {
    createTRPCRouter: t.router,
    createCallerFactory: t.createCallerFactory,
    publicProcedure: t.procedure,
    protectedProcedure,
    adminProcedure,
  };
});

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

function adminSession(overrides?: Partial<Session["user"]>): NonNullable<TRPCContext["session"]> {
  const user: Session["user"] = {
    id: "admin-1",
    email: "admin@example.com",
    emailVerified: true,
    name: "Admin",
    role: "admin",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-06-01"),
    ...overrides,
  };
  return {
    session: {
      id: "sess-admin",
      userId: user.id,
      expiresAt: new Date("2026-01-01"),
      token: "tok-admin",
      ipAddress: null,
      userAgent: null,
      createdAt: new Date("2025-01-01"),
      updatedAt: new Date("2025-06-01"),
    },
    user,
  };
}

const { userRouter } = await import("../trpc/routers/user");

describe("userRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
      const ctx = makeMockContext();

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

  describe("list", () => {
    it("throws FORBIDDEN for non-admin session", async () => {
      const ctx = makeMockContext({
        session: adminSession({ role: "staff", id: "staff-1", email: "s@example.com" }),
      });
      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(userRouter)(ctx);
      await expect(caller.list({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("allows owner to list users", async () => {
      const items = [
        {
          id: "u1",
          email: "a@example.com",
          name: "A",
          role: "owner",
          emailVerified: true,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const db = makeMockDb() as unknown as Record<string, ReturnType<typeof vi.fn>>;
      let selectCall = 0;
      db.select = vi.fn(() => {
        selectCall += 1;
        if (selectCall === 1) {
          const terminal = {
            from: vi.fn(() => terminal),
            where: vi.fn(() => terminal),
            orderBy: vi.fn(() => terminal),
            limit: vi.fn(() => terminal),
            offset: vi.fn(() => terminal),
            then: (resolve: (v: unknown) => unknown) => Promise.resolve(items).then(resolve),
          };
          return terminal;
        }
        const countTerminal = {
          from: vi.fn(() => countTerminal),
          where: vi.fn(() => countTerminal),
          then: (resolve: (v: unknown) => unknown) => Promise.resolve([{ count: 1 }]).then(resolve),
        };
        return countTerminal;
      });

      const ctx = makeMockContext({
        session: adminSession({ role: "owner", id: "owner-1", email: "owner@example.com" }),
        db: db as unknown as TRPCContext["db"],
      });
      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(userRouter)(ctx);
      const result = await caller.list({ page: 1, limit: 20 });
      expect(result.items).toEqual(items);
      expect(result.total).toBe(1);
    });

    it("returns items for admin", async () => {
      const items = [
        {
          id: "u1",
          email: "a@example.com",
          name: "A",
          role: "admin",
          emailVerified: true,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const db = makeMockDb() as unknown as Record<string, ReturnType<typeof vi.fn>>;
      let selectCall = 0;
      db.select = vi.fn(() => {
        selectCall += 1;
        const chain: Record<string, unknown> = {};
        const self = () => chain;
        for (const m of ["from", "where", "orderBy", "limit", "offset"]) {
          chain[m] = vi.fn(self);
        }
        if (selectCall === 1) {
          chain.offset = vi.fn(async () => items);
          const terminal = {
            from: vi.fn(() => terminal),
            where: vi.fn(() => terminal),
            orderBy: vi.fn(() => terminal),
            limit: vi.fn(() => terminal),
            offset: vi.fn(() => terminal),
            then: (resolve: (v: unknown) => unknown) => Promise.resolve(items).then(resolve),
          };
          return terminal;
        }
        const countTerminal = {
          from: vi.fn(() => countTerminal),
          where: vi.fn(() => countTerminal),
          then: (resolve: (v: unknown) => unknown) => Promise.resolve([{ count: 1 }]).then(resolve),
        };
        return countTerminal;
      });

      const ctx = makeMockContext({
        session: adminSession(),
        db: db as unknown as TRPCContext["db"],
      });
      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(userRouter)(ctx);
      const result = await caller.list({ page: 1, limit: 20 });
      expect(result.items).toEqual(items);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
  });

  describe("invite", () => {
    it("throws FORBIDDEN for staff", async () => {
      const ctx = makeMockContext({
        session: adminSession({ role: "staff", id: "staff-1", email: "s@example.com" }),
      });
      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(userRouter)(ctx);
      await expect(
        caller.invite({ email: "new@example.com", name: "New", role: "staff" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("creates user and requests password reset for admin", async () => {
      const db = makeMockDb() as unknown as Record<string, ReturnType<typeof vi.fn>>;
      let selectCall = 0;
      db.select = vi.fn(() => {
        selectCall += 1;
        const empty = {
          from: vi.fn(() => empty),
          where: vi.fn(() => empty),
          limit: vi.fn(async () => []),
          then: (resolve: (v: unknown) => unknown) => Promise.resolve([]).then(resolve),
        };
        return empty;
      });
      const updated = {
        id: "new-user-id",
        email: "invitee@example.com",
        name: "Invitee",
        role: "staff",
        createdAt: new Date(),
      };
      const updateChain: Record<string, unknown> = {};
      const self = () => updateChain;
      for (const m of ["set", "where", "returning"]) {
        updateChain[m] = vi.fn(self);
      }
      updateChain.returning = vi.fn(async () => [updated]);
      db.update = vi.fn(() => updateChain);

      const ctx = makeMockContext({
        session: adminSession(),
        db: db as unknown as TRPCContext["db"],
      });
      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(userRouter)(ctx);
      const result = await caller.invite({
        email: "invitee@example.com",
        name: "Invitee",
        role: "staff",
      });
      expect(result).toMatchObject({ id: "new-user-id", email: "invitee@example.com" });
      expect(mockSignUpEmail).toHaveBeenCalled();
      expect(mockRequestPasswordReset).toHaveBeenCalled();
      void selectCall;
    });
  });

  describe("resendInvite", () => {
    it("throws FORBIDDEN for staff", async () => {
      const ctx = makeMockContext({
        session: adminSession({ role: "staff", id: "staff-1", email: "s@example.com" }),
      });
      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(userRouter)(ctx);
      await expect(
        caller.resendInvite({ id: "00000000-0000-4000-8000-000000000001" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("throws NOT_FOUND when user missing", async () => {
      const db = makeMockDb() as unknown as Record<string, ReturnType<typeof vi.fn>>;
      const empty = {
        from: vi.fn(() => empty),
        where: vi.fn(() => empty),
        limit: vi.fn(async () => []),
        then: (resolve: (v: unknown) => unknown) => Promise.resolve([]).then(resolve),
      };
      db.select = vi.fn(() => empty);

      const ctx = makeMockContext({
        session: adminSession(),
        db: db as unknown as TRPCContext["db"],
      });
      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(userRouter)(ctx);
      await expect(
        caller.resendInvite({ id: "00000000-0000-4000-8000-000000000099" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("requests password reset for existing credential user", async () => {
      mockRequestPasswordReset.mockClear();
      mockSignUpEmail.mockClear();
      const db = makeMockDb() as unknown as Record<string, ReturnType<typeof vi.fn>>;
      let selectCall = 0;
      db.select = vi.fn(() => {
        selectCall += 1;
        if (selectCall === 1) {
          const userRow = {
            id: "00000000-0000-4000-8000-000000000010",
            email: "staff@example.com",
            name: "Staff",
            role: "staff",
          };
          const chain: Record<string, unknown> = {};
          const self = () => chain;
          chain.from = vi.fn(self);
          chain.where = vi.fn(self);
          chain.limit = vi.fn(async () => [userRow]);
          return chain;
        }
        const credChain: Record<string, unknown> = {};
        const self = () => credChain;
        credChain.from = vi.fn(self);
        credChain.where = vi.fn(self);
        credChain.limit = vi.fn(async () => [{ id: "cred-1" }]);
        return credChain;
      });

      const ctx = makeMockContext({
        session: adminSession(),
        db: db as unknown as TRPCContext["db"],
      });
      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(userRouter)(ctx);
      const result = await caller.resendInvite({
        id: "00000000-0000-4000-8000-000000000010",
      });
      expect(result).toMatchObject({
        id: "00000000-0000-4000-8000-000000000010",
        email: "staff@example.com",
      });
      expect(mockRequestPasswordReset).toHaveBeenCalled();
      expect(mockSignUpEmail).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("rejects deleting own account", async () => {
      const ctx = makeMockContext({ session: adminSession() });
      const { createCallerFactory } = await import("../trpc/init");
      const caller = createCallerFactory(userRouter)(ctx);
      await expect(caller.delete({ id: "admin-1" })).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });
  });
});
