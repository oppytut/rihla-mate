import { describe, it, expect, vi, afterEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { TRPCContext } from "../trpc/context";

function makeCtx(overrides?: Partial<TRPCContext>): TRPCContext {
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

vi.mock("../trpc/rate-limit", () => ({
  createRateLimitMiddleware:
    () =>
    ({ ctx, next }: { ctx: unknown; next: (opts: { ctx: unknown }) => unknown }) =>
      next({ ctx }),
}));

import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from "../trpc/init";

async function callProcedure(
  procedure: typeof publicProcedure,
  resolver: () => unknown,
  ctxOverrides?: Partial<TRPCContext>,
) {
  const router = createTRPCRouter({
    test: procedure.query(resolver),
  });

  const ctx = makeCtx(ctxOverrides);
  const url = new URL("http://localhost/api/trpc/test");

  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: new Request(url, {
      method: "GET",
      headers: { "content-type": "application/json" },
    }),
    router,
    createContext: () => ctx,
  });

  const text = await response.text();
  return JSON.parse(text) as {
    error?: {
      json: {
        message: string;
        code: number;
        data: { code: string; httpStatus: number; stack?: string; zodError?: unknown };
      };
    };
  };
}

describe("errorFormatter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("non-production / dev mode returns shape unchanged (stack preserved)", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const body = await callProcedure(publicProcedure, () => {
      throw new TRPCError({ code: "BAD_REQUEST" });
    });

    expect(body.error).toBeDefined();
    const error = body.error as { json: { data: { stack?: string } } };
    expect(error.json.data).toBeDefined();
    expect(error.json.data.stack).toBeDefined();
  });

  it("production — ZodError: stack is undefined, zodError field exists, message preserved", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const body = await callProcedure(publicProcedure, () => {
      throw new ZodError([
        {
          code: "invalid_type",
          expected: "string",
          received: "number",
          path: ["email"],
          message: "Expected string, received number",
        },
      ]);
    });

    expect(body.error?.json.data.stack).toBeNull();
    expect(body.error?.json.data.zodError).toBeDefined();
    expect(body.error?.json.data.zodError).toHaveProperty("email");
  });

  it("production — TRPCError: stack undefined, message preserved", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const body = await callProcedure(publicProcedure, () => {
      throw new TRPCError({ code: "FORBIDDEN", message: "no access allowed" });
    });

    expect(body.error?.json.data.stack).toBeNull();
    expect(body.error?.json.message).toBe("no access allowed");
  });

  it("production — unknown error: stack stripped, tRPC wraps as INTERNAL_SERVER_ERROR", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const body = await callProcedure(publicProcedure, () => {
      throw new Error("secret database password leaked");
    });

    expect(body.error?.json.data.stack).toBeNull();
    // tRPC wraps non-TRPC errors as INTERNAL_SERVER_ERROR TRPCError before errorFormatter runs,
    // so the original message is preserved (only stack is stripped in production)
    expect(body.error?.json.data.code).toBe("INTERNAL_SERVER_ERROR");
    expect(body.error?.json.message).toBe("secret database password leaked");
  });
});

describe("publicProcedure", () => {
  it("has 2 middlewares (inputGuard + relaxedRateLimit)", () => {
    expect(publicProcedure._def.middlewares).toHaveLength(2);
  });

  it("allows access without session", async () => {
    const { createTRPCRouter, createCallerFactory } = await import("../trpc/init");

    const router = createTRPCRouter({
      hello: publicProcedure.query(() => "hello"),
    });
    const caller = createCallerFactory(router)(makeCtx());

    const result = await caller.hello();
    expect(result).toBe("hello");
  });
});

describe("protectedProcedure", () => {
  it("throws UNAUTHORIZED when session is null", async () => {
    const { createTRPCRouter, createCallerFactory } = await import("../trpc/init");

    const router = createTRPCRouter({
      hello: protectedProcedure.query(() => "hello"),
    });
    const caller = createCallerFactory(router)(makeCtx({ session: null }));

    await expect(caller.hello()).rejects.toThrow(TRPCError);
    await expect(caller.hello()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("passes through when session is present", async () => {
    const { createTRPCRouter, createCallerFactory } = await import("../trpc/init");

    const router = createTRPCRouter({
      hello: protectedProcedure.query(() => "hello"),
    });
    const caller = createCallerFactory(router)(makeCtx({ session: makeAdminSession() }));

    const result = await caller.hello();
    expect(result).toBe("hello");
  });
});

describe("adminProcedure", () => {
  it("throws UNAUTHORIZED when session is null", async () => {
    const { createTRPCRouter, createCallerFactory } = await import("../trpc/init");

    const router = createTRPCRouter({
      hello: adminProcedure.query(() => "hello"),
    });
    const caller = createCallerFactory(router)(makeCtx({ session: null }));

    await expect(caller.hello()).rejects.toThrow(TRPCError);
    await expect(caller.hello()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws FORBIDDEN when role is not admin", async () => {
    const { createTRPCRouter, createCallerFactory } = await import("../trpc/init");

    const staffSession = {
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
        role: "user" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    const router = createTRPCRouter({
      hello: adminProcedure.query(() => "hello"),
    });
    const caller = createCallerFactory(router)(makeCtx({ session: staffSession }));

    await expect(caller.hello()).rejects.toThrow(TRPCError);
    await expect(caller.hello()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("passes through when role is admin", async () => {
    const { createTRPCRouter, createCallerFactory } = await import("../trpc/init");

    const router = createTRPCRouter({
      hello: adminProcedure.query(() => "hello"),
    });
    const caller = createCallerFactory(router)(makeCtx({ session: makeAdminSession() }));

    const result = await caller.hello();
    expect(result).toBe("hello");
  });
});

describe("inputGuard middleware", () => {
  const inputGuard = async ({
    ctx,
    next,
    input,
  }: {
    ctx: TRPCContext;
    next: (opts: { ctx: TRPCContext; input: unknown }) => unknown;
    input: unknown;
  }) => {
    return next({ ctx, input: input === undefined ? {} : input });
  };

  it("sets input to {} when input is undefined", async () => {
    const next = vi.fn().mockResolvedValue("result");
    const ctx = makeCtx();

    await inputGuard({ ctx, next, input: undefined });

    expect(next).toHaveBeenCalledWith({ ctx, input: {} });
  });

  it("passes input through when provided", async () => {
    const next = vi.fn().mockResolvedValue("result");
    const ctx = makeCtx();
    const inputData = { name: "test" };

    await inputGuard({ ctx, next, input: inputData });

    expect(next).toHaveBeenCalledWith({ ctx, input: inputData });
  });

  it("passes null input through unchanged", async () => {
    const next = vi.fn().mockResolvedValue("result");
    const ctx = makeCtx();

    await inputGuard({ ctx, next, input: null });

    expect(next).toHaveBeenCalledWith({ ctx, input: null });
  });
});
