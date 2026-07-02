import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetSession, mockLoggerError } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockLoggerError: vi.fn(),
}));

vi.mock("../auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

vi.mock("../utils/logger", () => ({
  logger: {
    error: mockLoggerError,
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../db/client", () => ({
  db: { __mockDb: true },
}));

import { createTRPCContext } from "../trpc/context";

describe("createTRPCContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function makeOpts(headersInit?: Record<string, string>): any {
    const headers = new Headers(headersInit);
    return {
      req: { headers } as Request,
      resHeaders: new Headers(),
    };
  }

  it("returns headers and db when no session exists", async () => {
    mockGetSession.mockResolvedValue(null);

    const opts = makeOpts({ "content-type": "application/json" });
    const ctx = await createTRPCContext(opts);

    expect(ctx.headers).toBe(opts.req.headers);
    expect(ctx.db).toBeDefined();
    expect(ctx.session).toBeNull();
  });

  it("returns session when auth resolves successfully", async () => {
    const mockSession = {
      session: {
        id: "sess-1",
        userId: "user-1",
        expiresAt: new Date(),
        token: "tok-abc",
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      user: {
        id: "user-1",
        email: "user@test.com",
        emailVerified: true,
        name: "Test User",
        role: "staff",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
    mockGetSession.mockResolvedValue(mockSession);

    const opts = makeOpts();
    const ctx = await createTRPCContext(opts);

    expect(ctx.session).toEqual(mockSession);
    expect(ctx.db).toBeDefined();
  });

  it("returns session=null and logs error when getSession throws", async () => {
    const authError = new Error("Auth service down");
    mockGetSession.mockRejectedValue(authError);

    const opts = makeOpts();
    const ctx = await createTRPCContext(opts);

    expect(ctx.session).toBeNull();
    expect(ctx.db).toBeDefined();
    expect(ctx.headers).toBe(opts.req.headers);

    expect(mockLoggerError).toHaveBeenCalledTimes(1);
    expect(mockLoggerError).toHaveBeenCalledWith(
      "[tRPC] Failed to resolve session:",
      { component: "context" },
      authError,
    );
  });

  it("logs error but still returns context on auth failure", async () => {
    mockGetSession.mockRejectedValue(new Error("boom"));

    const opts = makeOpts();
    const ctx = await createTRPCContext(opts);

    expect(ctx.session).toBeNull();
    expect(ctx.db).toBeDefined();
    expect(ctx.headers).toBeDefined();
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it("passes request headers to getSession", async () => {
    mockGetSession.mockResolvedValue(null);

    const opts = makeOpts({ "x-custom-header": "custom-value" });
    await createTRPCContext(opts);

    expect(mockGetSession).toHaveBeenCalledWith({
      headers: opts.req.headers,
    });
  });

  it("handles session with user that has undefined role", async () => {
    const sessionWithUndefinedRole = {
      session: {
        id: "sess-3",
        userId: "user-3",
        expiresAt: new Date(),
        token: "tok-xyz",
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      user: {
        id: "user-3",
        email: "norole@test.com",
        emailVerified: false,
        name: "No Role User",
        role: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
    mockGetSession.mockResolvedValue(sessionWithUndefinedRole);

    const opts = makeOpts();
    const ctx = await createTRPCContext(opts);

    expect(ctx.session).toEqual(sessionWithUndefinedRole);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(ctx.session!.user.role).toBeUndefined();
  });

  it("handles session with user that has null role", async () => {
    const sessionWithNullRole = {
      session: {
        id: "sess-4",
        userId: "user-4",
        expiresAt: new Date(),
        token: "tok-null",
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      user: {
        id: "user-4",
        email: "nullrole@test.com",
        emailVerified: false,
        name: "Null Role User",
        role: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
    mockGetSession.mockResolvedValue(sessionWithNullRole);

    const opts = makeOpts();
    const ctx = await createTRPCContext(opts);

    expect(ctx.session).toEqual(sessionWithNullRole);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(ctx.session!.user.role).toBeNull();
  });
});
