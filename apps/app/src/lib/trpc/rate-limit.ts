import { TRPCError } from "@trpc/server";
import type { TRPCContext } from "./context";
// Regex-based IP validation (replaces net.isIP for Workers compatibility)
const IPV4_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

function isValidIP(ip: string): boolean {
  if (!IPV4_RE.test(ip)) return false;
  return ip.split(".").every((octet) => {
    const n = Number.parseInt(octet, 10);
    return n >= 0 && n <= 255;
  });
}

interface RateLimitEntry {
  timestamps: number[];
}

const MAX_STORE_SIZE = 10000;

const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStoreKey(windowMs: number, maxRequests: number): string {
  return `${windowMs}:${maxRequests}`;
}

function getStore(windowMs: number, maxRequests: number): Map<string, RateLimitEntry> {
  const key = getStoreKey(windowMs, maxRequests);
  let store = stores.get(key);
  if (!store) {
    store = new Map<string, RateLimitEntry>();
    stores.set(key, store);
  }
  return store;
}

export function extractIP(ctx: TRPCContext): string {
  const headers = ctx.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0]?.trim() ?? "";
    if (isValidIP(ip)) {
      return ip;
    }
    return "unknown";
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

export function cleanupStore(store: Map<string, RateLimitEntry>, windowMs: number): void {
  const cutoff = Date.now() - windowMs * 2;
  for (const [ip, entry] of store) {
    entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(ip);
    }
  }
}

export function cleanupAllStores(): void {
  const now = Date.now();
  for (const [key, store] of stores) {
    const windowMs = Number.parseInt(key.split(":")[0] ?? "", 10);
    if (Number.isNaN(windowMs)) continue;
    const cutoff = now - windowMs * 2;
    for (const [ip, entry] of store) {
      entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
      if (entry.timestamps.length === 0) {
        store.delete(ip);
      }
    }
  }
}

export function createRateLimitMiddleware(windowMs: number, maxRequests: number) {
  const store = getStore(windowMs, maxRequests);

  return async ({
    ctx,
    next,
  }: {
    ctx: TRPCContext;
    next: (opts: { ctx: TRPCContext }) => Promise<unknown>;
  }) => {
    // Skip rate limiting in E2E tests where all requests share one IP
    if (process.env.SKIP_RATE_LIMIT === "true") {
      return next({ ctx });
    }

    cleanupStore(store, windowMs);
    cleanupAllStores();
    const ip = extractIP(ctx);

    if (ip === "unknown") {
      return next({ ctx });
    }

    const now = Date.now();
    const cutoff = now - windowMs;

    let entry = store.get(ip);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(ip, entry);
    }

    if (store.size > MAX_STORE_SIZE) {
      let oldestIp: string | null = null;
      let oldestTimestamp = Infinity;
      for (const [entryIp, entryData] of store) {
        const minTs = Math.min(...entryData.timestamps);
        if (minTs < oldestTimestamp) {
          oldestTimestamp = minTs;
          oldestIp = entryIp;
        }
      }
      if (oldestIp) {
        store.delete(oldestIp);
      }
    }

    entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);
    entry.timestamps.push(now);

    if (entry.timestamps.length > maxRequests) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Try again in ${Math.ceil(windowMs / 1000)} seconds.`,
      });
    }

    return next({ ctx });
  };
}
