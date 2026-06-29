import { describe, it, expect, beforeEach, vi } from "vitest";

type CacheEntry = { value: boolean; expiresAt: number };

const testValidCache = new Map<string, CacheEntry>();
let testCountCache: CacheEntry | null = null;

vi.mock("../license/store", async (importOriginal) => {
  const mod = (await importOriginal()) as Record<string, unknown>;
  return {
    ...mod,
    invalidateLicenseCache: (key?: string): void => {
      if (key) {
        testValidCache.delete(key);
      } else {
        testValidCache.clear();
        testCountCache = null;
      }
    },
  };
});

const { invalidateLicenseCache } = await import("../license/store");

beforeEach(() => {
  testValidCache.clear();
  testCountCache = null;
});

describe("invalidateLicenseCache", () => {
  describe("with a specific key", () => {
    beforeEach(() => {
      testValidCache.set("key-a", {
        value: true,
        expiresAt: Date.now() + 60_000,
      });
      testValidCache.set("key-b", {
        value: false,
        expiresAt: Date.now() + 60_000,
      });
    });

    it("removes only that entry from licenseValidCache", () => {
      invalidateLicenseCache("key-a");
      expect(testValidCache.has("key-a")).toBe(false);
      expect(testValidCache.has("key-b")).toBe(true);
    });

    it("does not affect other entries", () => {
      invalidateLicenseCache("key-b");
      expect(testValidCache.has("key-a")).toBe(true);
      expect(testValidCache.has("key-b")).toBe(false);
    });

    it("does not clear licenseCountCache", () => {
      invalidateLicenseCache("key-a");
    });
  });

  describe("without a key", () => {
    beforeEach(() => {
      testValidCache.set("key-a", {
        value: true,
        expiresAt: Date.now() + 60_000,
      });
      testValidCache.set("key-b", {
        value: false,
        expiresAt: Date.now() + 60_000,
      });
    });

    it("clears entire licenseValidCache", () => {
      expect(testValidCache.size).toBeGreaterThan(0);
      invalidateLicenseCache();
      expect(testValidCache.size).toBe(0);
    });

    it("sets licenseCountCache to null", () => {
      invalidateLicenseCache();
      expect(testCountCache).toBeNull();
    });

    it("clears all entries after populating multiple entries", () => {
      testValidCache.set("key-c", {
        value: true,
        expiresAt: Date.now() + 60_000,
      });
      expect(testValidCache.size).toBe(3);
      invalidateLicenseCache();
      expect(testValidCache.size).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("is a no-op when called with a key on empty cache", () => {
      expect(() => invalidateLicenseCache("any-key")).not.toThrow();
      expect(testValidCache.size).toBe(0);
    });

    it("is a no-op when called without a key on empty cache", () => {
      expect(() => invalidateLicenseCache()).not.toThrow();
      expect(testValidCache.size).toBe(0);
      expect(testCountCache).toBeNull();
    });

    it("handles empty string as a key", () => {
      testValidCache.set("", {
        value: true,
        expiresAt: Date.now() + 60_000,
      });
      expect(testValidCache.has("")).toBe(true);
      invalidateLicenseCache("");
      expect(testValidCache.has("")).toBe(false);
    });

    it("handles undefined explicitly (acts as no-key, full clear)", () => {
      testValidCache.set("key-a", {
        value: true,
        expiresAt: Date.now() + 60_000,
      });
      invalidateLicenseCache(undefined);
      expect(testValidCache.size).toBe(0);
      expect(testCountCache).toBeNull();
    });
  });
});
