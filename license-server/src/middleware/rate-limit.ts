import type { Context, Next } from "hono";
import { Redis } from "@upstash/redis";

interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowSeconds: 60,
  maxRequests: 10,
};

export function rateLimitMiddleware(config?: Partial<RateLimitConfig>) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  let redis: Redis | null = null;
  try {
    if (process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_URL,
        token: process.env.UPSTASH_REDIS_TOKEN,
      });
    }
  } catch {
    redis = null;
  }

  return async (c: Context, next: Next) => {
    if (!redis) {
      return next();
    }

    const licenseId =
      c.req.header("X-License-Id") ??
      c.req.header("x-forwarded-for") ??
      "unknown";

    const key = `rl:${licenseId}`;

    try {
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, cfg.windowSeconds);
      }

      if (current > cfg.maxRequests) {
        return c.json(
          { error: "Too many requests", retryAfter: cfg.windowSeconds },
          429,
        );
      }

      await next();
    } catch {
      await next();
    }
  };
}
