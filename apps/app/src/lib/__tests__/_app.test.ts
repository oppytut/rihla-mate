import { describe, it, expect, vi } from "vitest";
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
    protectedProcedure: t.procedure,
    adminProcedure: t.procedure,
  };
});

const { appRouter } = await import("../trpc/routers/_app");
const { createCallerFactory } = await import("../trpc/init");

function makeCtx(overrides: Partial<TRPCContext> = {}): TRPCContext {
  return {
    headers: new Headers(),
    db: {} as TRPCContext["db"],
    session: null,
    ...overrides,
  } as TRPCContext;
}

function createCaller(ctx: TRPCContext = makeCtx()) {
  const callerFactory = createCallerFactory(appRouter);
  return callerFactory(ctx);
}

describe("appRouter", () => {
  it("exports AppRouter type", () => {
    const router: unknown = appRouter;
    expect(router).toBeDefined();
  });

  it("has all sub-router keys", () => {
    const expectedKeys = [
      "health",
      "license",
      "featureTest",
      "installer",
      "packages",
      "bookings",
      "user",
      "midtrans",
      "dashboard",
    ];
    // _def is the internal tRPC definition that holds router procedures
    const routerDef = appRouter._def as {
      procedures: Record<string, unknown>;
      record: Record<string, unknown>;
    };
    // Sub-routers appear under `record` as router references, not expanded procedures
    const routerKeys = Object.keys(routerDef.record ?? {}).sort();
    expect(routerKeys).toEqual(expectedKeys.sort());
  });
});

describe("appRouter.health", () => {
  it("returns status ok", async () => {
    const caller = createCaller();
    const result = await caller.health();
    expect(result).toEqual({ status: "ok" });
  });

  it("returns status ok without session", async () => {
    const caller = createCaller(makeCtx());
    const result = await caller.health();
    expect(result).toEqual({ status: "ok" });
  });

  it("returns status ok even with session", async () => {
    const caller = createCaller(
      makeCtx({
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
      }),
    );
    const result = await caller.health();
    expect(result).toEqual({ status: "ok" });
  });
});
