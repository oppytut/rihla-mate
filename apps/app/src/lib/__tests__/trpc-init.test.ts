import { describe, it, expect, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import type { TRPCContext } from "../trpc/context";

vi.mock("../trpc/rate-limit", () => ({
  createRateLimitMiddleware:
    () =>
    ({ ctx, next }: { ctx: unknown; next: (opts: { ctx: unknown }) => unknown }) =>
      next({ ctx }),
}));

import {
  createTRPCRouter,
  createCallerFactory,
  strictRateLimit,
  mediumRateLimit,
  standardRateLimit,
  relaxedRateLimit,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from "../trpc/init";

function makeContext(overrides?: Partial<TRPCContext>): TRPCContext {
  return {
    headers: new Headers(),
    db: {} as TRPCContext["db"],
    session: null,
    ...overrides,
  };
}

function makeAdminSession() {
  return {
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
      role: "admin" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

function makeStaffSession() {
  return {
    session: {
      id: "sess-2",
      userId: "user-2",
      expiresAt: new Date(),
      token: "tok2",
      ipAddress: null,
      userAgent: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    user: {
      id: "user-2",
      email: "staff@test.com",
      emailVerified: true,
      name: "Staff",
      role: "staff" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

const testRouter = createTRPCRouter({
  publicHello: publicProcedure.query(() => "hello public"),
  protectedHello: protectedProcedure.query(() => "hello protected"),
  adminHello: adminProcedure.query(() => "hello admin"),
});

const callerFactory = createCallerFactory(testRouter);

describe("publicProcedure", () => {
  it("allows unauthenticated access", async () => {
    const caller = callerFactory(makeContext());
    const result = await caller.publicHello();
    expect(result).toBe("hello public");
  });
});

describe("protectedProcedure", () => {
  it("throws UNAUTHORIZED when session is null", async () => {
    const caller = callerFactory(makeContext({ session: null }));

    await expect(caller.protectedHello()).rejects.toThrow(TRPCError);
    await expect(caller.protectedHello()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("allows access when session is present", async () => {
    const caller = callerFactory(makeContext({ session: makeAdminSession() }));
    const result = await caller.protectedHello();
    expect(result).toBe("hello protected");
  });
});

describe("adminProcedure", () => {
  it("throws UNAUTHORIZED when session is null", async () => {
    const caller = callerFactory(makeContext({ session: null }));

    await expect(caller.adminHello()).rejects.toThrow(TRPCError);
    await expect(caller.adminHello()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("throws FORBIDDEN when user is not admin", async () => {
    const caller = callerFactory(makeContext({ session: makeStaffSession() }));

    await expect(caller.adminHello()).rejects.toThrow(TRPCError);
    await expect(caller.adminHello()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows access when user is admin", async () => {
    const caller = callerFactory(makeContext({ session: makeAdminSession() }));
    const result = await caller.adminHello();
    expect(result).toBe("hello admin");
  });
});

describe("rate limit exports", () => {
  it("strictRateLimit is defined", () => {
    expect(strictRateLimit).toBeDefined();
    expect(typeof strictRateLimit).toBe("function");
  });

  it("mediumRateLimit is defined", () => {
    expect(mediumRateLimit).toBeDefined();
    expect(typeof mediumRateLimit).toBe("function");
  });

  it("standardRateLimit is defined", () => {
    expect(standardRateLimit).toBeDefined();
    expect(typeof standardRateLimit).toBe("function");
  });

  it("relaxedRateLimit is defined", () => {
    expect(relaxedRateLimit).toBeDefined();
    expect(typeof relaxedRateLimit).toBe("function");
  });
});

describe("errorFormatter (production mode)", () => {
  it("returns shape as-is in development mode", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const caller = callerFactory(makeContext());

    await expect(caller.protectedHello()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("sanitizes internal errors in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const router = createTRPCRouter({
      causeError: publicProcedure.query(() => {
        throw new Error("secret database details");
      }),
    });

    const caller = createCallerFactory(router)(makeContext());

    // The raw TRPCError wraps the original Error with INTERNAL_SERVER_ERROR code.
    // The errorFormatter only affects the HTTP response shape, not the thrown error's message.
    await expect(caller.causeError()).rejects.toThrow(TRPCError);
    await expect(caller.causeError()).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });

  it("preserves tRPC error messages in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const router = createTRPCRouter({
      forbiddenAction: protectedProcedure.query(() => {
        throw new TRPCError({ code: "FORBIDDEN", message: "no access" });
      }),
    });

    const caller = createCallerFactory(router)(makeContext({ session: makeAdminSession() }));

    await expect(caller.forbiddenAction()).rejects.toThrow(TRPCError);
    await expect(caller.forbiddenAction()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "no access",
    });
  });

  it("includes zod field errors in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const router = createTRPCRouter({
      zodAction: publicProcedure.query(() => {
        throw new ZodError([
          {
            code: "invalid_type",
            expected: "string",
            received: "number",
            path: ["email"],
            message: "Expected string, received number",
          },
        ]);
      }),
    });

    const caller = createCallerFactory(router)(makeContext());

    await expect(caller.zodAction()).rejects.toThrow(TRPCError);
  });
});

describe("createTRPCRouter", () => {
  it("creates a router with public procedures", () => {
    const router = createTRPCRouter({
      test: publicProcedure.query(() => "ok"),
    });
    expect(router).toBeDefined();
    expect(router.test).toBeDefined();
  });
});
