import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  extractIP,
  cleanupStore,
  createRateLimitMiddleware,
} from "../rate-limit";
import type { TRPCContext } from "../context";

function createMockContext(headers: Record<string, string>): TRPCContext {
  const h = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    h.set(key, value);
  }
  return { headers: h } as TRPCContext;
}

describe("extractIP", () => {
  it("returns the leftmost (client) IP from x-forwarded-for", () => {
    const ctx = createMockContext({ "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12" });
    expect(extractIP(ctx)).toBe("1.2.3.4");
  });

  it("returns the IP from a single-value x-forwarded-for", () => {
    const ctx = createMockContext({ "x-forwarded-for": "192.168.1.1" });
    expect(extractIP(ctx)).toBe("192.168.1.1");
  });

  it("falls back to x-real-ip when x-forwarded-for is missing", () => {
    const ctx = createMockContext({ "x-real-ip": "10.0.0.1" });
    expect(extractIP(ctx)).toBe("10.0.0.1");
  });

  it("prefers x-forwarded-for over x-real-ip when both are present", () => {
    const ctx = createMockContext({
      "x-forwarded-for": "1.2.3.4",
      "x-real-ip": "10.0.0.1",
    });
    expect(extractIP(ctx)).toBe("1.2.3.4");
  });

  it("returns unknown when neither header is present", () => {
    const ctx = createMockContext({});
    expect(extractIP(ctx)).toBe("unknown");
  });

  it("returns unknown when x-forwarded-for contains an invalid IP format", () => {
    const ctx = createMockContext({ "x-forwarded-for": "not-an-ip" });
    expect(extractIP(ctx)).toBe("unknown");
  });

  // net.isIP() rejects IPs with out-of-range octets (0-255 only)
  it("rejects IPs with out-of-range octets via net.isIP", () => {
    const ctx = createMockContext({ "x-forwarded-for": "999.999.999.999" });
    expect(extractIP(ctx)).toBe("unknown");
  });

  it("returns unknown when x-forwarded-for starts with an invalid IP", () => {
    const ctx = createMockContext({
      "x-forwarded-for": "invalid, 1.2.3.4",
    });
    expect(extractIP(ctx)).toBe("unknown");
  });

  it("returns unknown when x-forwarded-for is empty string", () => {
    const ctx = createMockContext({ "x-forwarded-for": "" });
    expect(extractIP(ctx)).toBe("unknown");
  });
});

describe("cleanupStore", () => {
  beforeEach(() => {
    // Ensure Date.now() returns real time for these tests
    vi.restoreAllMocks();
  });

  it("removes expired entries (older than 2x windowMs)", () => {
    const now = Date.now();
    const windowMs = 1000;
    const store = new Map([
      ["1.2.3.4", { timestamps: [now - windowMs * 3] }],
      ["5.6.7.8", { timestamps: [now - windowMs * 2 - 100] }],
    ]);

    cleanupStore(store, windowMs);

    expect(store.has("1.2.3.4")).toBe(false);
    expect(store.has("5.6.7.8")).toBe(false);
  });

  it("keeps valid entries (within 2x windowMs)", () => {
    const now = Date.now();
    const windowMs = 1000;
    const store = new Map([
      ["1.2.3.4", { timestamps: [now - 500] }],
    ]);

    cleanupStore(store, windowMs);

    expect(store.has("1.2.3.4")).toBe(true);
    expect(store.get("1.2.3.4")!.timestamps).toEqual([now - 500]);
  });

  it("removes the entry when all its timestamps are expired", () => {
    const now = Date.now();
    const windowMs = 1000;
    const store = new Map([
      ["1.2.3.4", { timestamps: [now - windowMs * 3, now - windowMs * 4] }],
    ]);

    cleanupStore(store, windowMs);

    expect(store.has("1.2.3.4")).toBe(false);
  });

  it("keeps a mix of valid and expired timestamps for the same IP", () => {
    const now = Date.now();
    const windowMs = 1000;
    const store = new Map([
      ["1.2.3.4", { timestamps: [now - windowMs * 3, now - 200] }],
    ]);

    cleanupStore(store, windowMs);

    expect(store.has("1.2.3.4")).toBe(true);
    expect(store.get("1.2.3.4")!.timestamps).toEqual([now - 200]);
  });

  it("does nothing on an empty store", () => {
    const store = new Map();
    cleanupStore(store, 1000);
    expect(store.size).toBe(0);
  });
});

describe("createRateLimitMiddleware", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("allows a request within the rate limit", async () => {
    const middleware = createRateLimitMiddleware(1000, 5);
    const ctx = createMockContext({ "x-forwarded-for": "1.2.3.4" });
    const next = vi.fn().mockResolvedValue("success");

    const result = await middleware({ ctx, next });

    expect(result).toBe("success");
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith({ ctx });
  });

  it("rejects requests that exceed the rate limit", async () => {
    const windowMs = 1000;
    const maxRequests = 2;
    const middleware = createRateLimitMiddleware(windowMs, maxRequests);
    const ctx = createMockContext({ "x-forwarded-for": "1.2.3.4" });
    const next = vi.fn().mockResolvedValue("success");

    // First two requests should succeed
    await middleware({ ctx, next });
    await middleware({ ctx, next });

    // Third request should be rate-limited
    await expect(middleware({ ctx, next })).rejects.toThrow("Rate limit exceeded");
  });

  it("allows requests again after the window passes", async () => {
    const windowMs = 500;
    const maxRequests = 2;
    const middleware = createRateLimitMiddleware(windowMs, maxRequests);
    const ctx = createMockContext({ "x-forwarded-for": "10.0.0.99" });
    const next = vi.fn().mockResolvedValue("success");

    // Exhaust the limit
    await middleware({ ctx, next });
    await middleware({ ctx, next });

    // Wait for window to pass
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Should be allowed again since old timestamps expired
    await expect(middleware({ ctx, next })).resolves.toBe("success");
  }, 5000);

  it("rejects unknown IP with BAD_REQUEST", async () => {
    const middleware = createRateLimitMiddleware(1000, 5);
    const ctx = createMockContext({});
    const next = vi.fn();

    await expect(middleware({ ctx, next })).rejects.toThrow(
      "Unable to determine client IP",
    );
  });

  it("maintains separate counters for different IPs", async () => {
    const middleware = createRateLimitMiddleware(1000, 1);
    const ctx1 = createMockContext({ "x-forwarded-for": "1.2.3.4" });
    const ctx2 = createMockContext({ "x-forwarded-for": "5.6.7.8" });
    const next = vi.fn().mockResolvedValue("success");

    // First request from IP1 succeeds
    await expect(middleware({ ctx: ctx1, next })).resolves.toBe("success");

    // First request from IP2 also succeeds (separate counter)
    await expect(middleware({ ctx: ctx2, next })).resolves.toBe("success");

    // Second request from IP1 is blocked
    await expect(middleware({ ctx: ctx1, next })).rejects.toThrow("Rate limit exceeded");
  });

  it("creates isolated stores for different windowMs/maxRequests combinations", async () => {
    const middleware1 = createRateLimitMiddleware(1000, 1);
    const middleware2 = createRateLimitMiddleware(2000, 1);
    const ctx = createMockContext({ "x-forwarded-for": "10.0.0.100" });
    const next = vi.fn().mockResolvedValue("success");

    // Exhaust middleware1
    await middleware1({ ctx, next });
    await expect(middleware1({ ctx, next })).rejects.toThrow("Rate limit exceeded");

    // middleware2 has its own store
    await expect(middleware2({ ctx, next })).resolves.toBe("success");
  });

  it("cleans up old timestamps before checking the limit", async () => {
    const windowMs = 500;
    const maxRequests = 2;
    const middleware = createRateLimitMiddleware(windowMs, maxRequests);
    const ctx = createMockContext({ "x-forwarded-for": "1.2.3.4" });
    const next = vi.fn().mockResolvedValue("success");

    // Exhaust the limit
    await middleware({ ctx, next });
    await middleware({ ctx, next });

    // Wait for window to pass
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Should be allowed again since old timestamps were cleaned up
    await expect(middleware({ ctx, next })).resolves.toBe("success");
  }, 5000);
});
