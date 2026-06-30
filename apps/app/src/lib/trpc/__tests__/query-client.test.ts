import { describe, it, expect, vi } from "vitest";

const { makeQueryClient } = await import("../query-client");

describe("makeQueryClient", () => {
  it("returns a QueryClient instance", () => {
    const client = makeQueryClient();
    expect(client).toBeDefined();
    expect(client.constructor.name).toBe("QueryClient");
  });

  it("sets staleTime to 30 seconds", () => {
    const client = makeQueryClient();
    const options = client.getDefaultOptions();
    expect(options.queries?.staleTime).toBe(30_000);
  });

  it("sets shouldDehydrateQuery as a function", () => {
    const client = makeQueryClient();
    const options = client.getDefaultOptions();
    expect(typeof options.dehydrate?.shouldDehydrateQuery).toBe("function");
  });

  it("shouldDehydrateQuery returns true when query status is pending", () => {
    const client = makeQueryClient();
    const fn = client.getDefaultOptions().dehydrate!.shouldDehydrateQuery!;
    const result = fn({ state: { status: "pending" } } as never);
    expect(result).toBe(true);
  });

  it("shouldDehydrateQuery returns false when query status is error", () => {
    const client = makeQueryClient();
    const fn = client.getDefaultOptions().dehydrate!.shouldDehydrateQuery!;
    // defaultShouldDehydrateQuery returns status === 'success'
    // combined: (status === 'success') || (status === 'pending')
    // error → false || false = false
    const result = fn({ state: { status: "error" } } as never);
    expect(result).toBe(false);
  });

  it("shouldDehydrateQuery returns true when query status is success (defaultShouldDehydrateQuery passes)", () => {
    const client = makeQueryClient();
    const fn = client.getDefaultOptions().dehydrate!.shouldDehydrateQuery!;
    // defaultShouldDehydrateQuery returns true for success
    // combined: true || false = true
    const result = fn({
      state: {
        status: "success",
        data: undefined,
        dataUpdateCount: 0,
        dataUpdatedAt: 0,
        error: null,
        errorUpdateCount: 0,
        errorUpdatedAt: 0,
        fetchFailureCount: 0,
        fetchFailureReason: null,
        fetchMeta: null,
        isInvalidated: false,
      },
      queryKey: ["test"],
    } as never);
    expect(result).toBe(true);
  });

  it("shouldDehydrateQuery returns true for pending queries (no data yet)", () => {
    const client = makeQueryClient();
    const fn = client.getDefaultOptions().dehydrate!.shouldDehydrateQuery!;
    const result = fn({
      state: {
        status: "pending",
        data: undefined,
        dataUpdateCount: 0,
        dataUpdatedAt: 0,
        error: null,
        errorUpdateCount: 0,
        errorUpdatedAt: 0,
        fetchFailureCount: 0,
        fetchFailureReason: null,
        fetchMeta: null,
        isInvalidated: false,
      },
      queryKey: ["test"],
    } as never);
    expect(result).toBe(true);
  });
});
