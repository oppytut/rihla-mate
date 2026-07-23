import type { PgDatabase } from "drizzle-orm/pg-core";
import type { NeonQueryResultHKT } from "drizzle-orm/neon-serverless";
import { env } from "@/env";
import * as schema from "./schema";

export type DrizzleClient = PgDatabase<NeonQueryResultHKT, typeof schema>;

let _dbPromise: Promise<DrizzleClient> | undefined;

async function initDb(): Promise<DrizzleClient> {
  if (env.DEPLOYMENT_TARGET === "cloudflare") {
    const { drizzle } = await import("drizzle-orm/neon-http");
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(env.DATABASE_URL);
    return drizzle(sql, { schema }) as unknown as DrizzleClient;
  }

  // VPS: pg is isolated in client.node.ts with turbopackIgnore to prevent
  // Turbopack from tracing it into Edge bundles.
  const { getNodeDb } = await import("./client.node");
  return getNodeDb();
}

export function getDb(): Promise<DrizzleClient> {
  if (!_dbPromise) _dbPromise = initDb();
  return _dbPromise;
}

// Synchronous db — only available after initialization.
// For VPS, init happens at server start via register() in instrumentation.ts.
// Callers that need db before init should use getDb() instead.
let _db: DrizzleClient | undefined;
export function setDb(db: DrizzleClient): void {
  _db = db;
}

export const db: DrizzleClient = new Proxy({} as DrizzleClient, {
  get(_, prop) {
    if (!_db) {
      throw new Error("db accessed before initialization. Call initDb() first.");
    }
    const value = (_db as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(_db)
      : value;
  },
});
