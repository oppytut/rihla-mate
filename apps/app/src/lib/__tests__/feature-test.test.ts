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
  };
});

const mockLicenseMiddleware = vi.fn(
  async ({ ctx, next }: { ctx: unknown; next: (opts: { ctx: unknown }) => unknown }) => {
    return next({ ctx });
  },
);

const mockRequireSeo = vi.fn(
  async ({ ctx, next }: { ctx: unknown; next: (opts: { ctx: unknown }) => unknown }) => {
    return next({ ctx });
  },
);

const mockRequireAnalytics = vi.fn(
  async ({ ctx, next }: { ctx: unknown; next: (opts: { ctx: unknown }) => unknown }) => {
    return next({ ctx });
  },
);

vi.mock("@/lib/license/guard", () => ({
  licenseMiddleware: mockLicenseMiddleware,
  requireFeature: (feature: string) => {
    if (feature === "seo") return mockRequireSeo;
    if (feature === "analytics") return mockRequireAnalytics;
    return mockRequireSeo;
  },
}));

const { featureTestRouter } = await import("../trpc/routers/feature-test");
const { createCallerFactory } = await import("../trpc/init");

function createCaller() {
  const ctx: TRPCContext = {
    headers: new Headers(),
    db: {} as TRPCContext["db"],
    session: null,
  };

  const callerFactory = createCallerFactory(featureTestRouter);
  return callerFactory(ctx);
}

describe("featureTestRouter.seoStatus", () => {
  let caller: ReturnType<typeof createCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    caller = createCaller();
  });

  it("returns { enabled: true } when licenseMiddleware and requireFeature pass", async () => {
    const result = await caller.seoStatus();
    expect(result).toEqual({ enabled: true });
    expect(mockLicenseMiddleware).toHaveBeenCalledOnce();
    expect(mockRequireSeo).toHaveBeenCalledOnce();
  });
});

describe("featureTestRouter.analyticsStatus", () => {
  let caller: ReturnType<typeof createCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    caller = createCaller();
  });

  it("returns { enabled: true } when licenseMiddleware and requireFeature pass", async () => {
    const result = await caller.analyticsStatus();
    expect(result).toEqual({ enabled: true });
    expect(mockLicenseMiddleware).toHaveBeenCalledOnce();
    expect(mockRequireAnalytics).toHaveBeenCalledOnce();
  });
});
