import { describe, it, expect } from "vitest";

const { makeQueryClient } = await import("../query-client");

function getShouldDehydrateQuery() {
  const client = makeQueryClient();
  const dehydrate = client.getDefaultOptions().dehydrate;
  if (!dehydrate?.shouldDehydrateQuery) {
    throw new Error("Expected shouldDehydrateQuery to be defined");
  }
  return dehydrate.shouldDehydrateQuery;
}

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
    const fn = getShouldDehydrateQuery();
    const result = fn({ state: { status: "pending" } } as never);
    expect(result).toBe(true);
  });

  it("shouldDehydrateQuery returns false when query status is error", () => {
    const fn = getShouldDehydrateQuery();
    // defaultShouldDehydrateQuery returns status === 'success'
    // combined: (status === 'success') || (status === 'pending')
    // error → false || false = false
    const result = fn({ state: { status: "error" } } as never);
    expect(result).toBe(false);
  });

  it("shouldDehydrateQuery returns true when query status is success (defaultShouldDehydrateQuery passes)", () => {
    const fn = getShouldDehydrateQuery();
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
    const fn = getShouldDehydrateQuery();
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
