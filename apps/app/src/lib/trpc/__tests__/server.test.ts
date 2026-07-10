// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

// server-only is compiled inside Next.js — not available to vitest
vi.mock("server-only", () => ({}));

// Define spies inside the factory so they're available at hoist time.
// The factory runs when vi.mock is hoisted, before any test code.
const mockReactCache = vi.fn((fn: (...args: unknown[]) => unknown) => fn);
const mockCreateTRPCOptionsProxy = vi.fn(() => ({}));
const mockDehydrate = vi.fn();
const mockHeaders = vi.fn();
const mockReactCreateElement = vi.fn();
const mockCreateCallerFactory = vi.fn().mockReturnValue(vi.fn(() => ({})));

vi.mock("../query-client", () => ({
  makeQueryClient: vi.fn(),
}));

vi.mock("@trpc/tanstack-react-query", () => ({
  createTRPCOptionsProxy: mockCreateTRPCOptionsProxy,
}));

vi.mock("@tanstack/react-query", () => ({
  HydrationBoundary: vi.fn(),
  dehydrate: mockDehydrate,
}));

vi.mock("../init", () => ({
  createCallerFactory: mockCreateCallerFactory,
}));

vi.mock("../routers/_app", () => ({
  appRouter: { _def: { _config: {} } },
}));

vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

vi.mock("react", () => ({
  createElement: mockReactCreateElement,
  cache: mockReactCache,
}));

vi.mock("@/lib/db/client", () => ({
  db: {},
}));

const { getQueryClient, trpc, caller, HydrateClient } = await import("../server");

describe("server.ts exports", () => {
  describe("getQueryClient", () => {
    it("is defined", () => {
      expect(getQueryClient).toBeDefined();
      expect(typeof getQueryClient).toBe("function");
    });

    it("calls react.cache with a function", () => {
      // Module-level code runs at import time; clearAllMocks would wipe this
      expect(mockReactCache).toHaveBeenCalled();
      expect(typeof mockReactCache.mock.calls[0][0]).toBe("function");
    });
  });

  describe("trpc", () => {
    it("is defined", () => {
      expect(trpc).toBeDefined();
    });

    it("is created via createTRPCOptionsProxy", () => {
      expect(mockCreateTRPCOptionsProxy).toHaveBeenCalledTimes(1);
      // @ts-expect-error vitest infers empty tuple type for Mock<() => {}>, but the call happens at import time
      const callArgs = mockCreateTRPCOptionsProxy.mock.calls[0][0];
      expect(callArgs).toHaveProperty("router");
      expect(callArgs).toHaveProperty("ctx");
      expect(callArgs).toHaveProperty("queryClient");
    });
  });

  describe("caller", () => {
    it("is defined", () => {
      expect(caller).toBeDefined();
    });

    it("is created via createCallerFactory", () => {
      expect(mockCreateCallerFactory).toHaveBeenCalledTimes(1);
    });
  });

  describe("HydrateClient", () => {
    it("is defined", () => {
      expect(HydrateClient).toBeDefined();
      expect(typeof HydrateClient).toBe("function");
    });

    it("renders HydrationBoundary via createElement", () => {
      // Clear mocks so we get a clean slate for this invocation test
      vi.clearAllMocks();
      mockDehydrate.mockReturnValueOnce({ dehydrated: "state" });

      HydrateClient({ children: "test-child" });

      expect(mockDehydrate).toHaveBeenCalled();
      expect(mockReactCreateElement).toHaveBeenCalledWith(
        expect.any(Function),
        { state: { dehydrated: "state" } },
        "test-child",
      );
    });
  });
});
