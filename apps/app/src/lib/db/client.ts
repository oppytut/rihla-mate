/**
 * Database client — provides a Drizzle ORM instance for the current deployment target.
 *
 * VPS (default): Uses `drizzle-orm/node-postgres` + `pg` Pool (node-postgres).
 * Cloudflare Workers: Uses `drizzle-orm/neon-serverless` + `@neondatabase/serverless`
 *   Pool with HTTP query mode (`poolQueryViaFetch: true`).
 *
 * DESIGN NOTE: The actual import("pg") call lives in client.node.ts, which is
 * loaded via a Proxy-based lazy initializer. This prevents Turbopack from
 * tracing the `pg` dependency during edge chunk compilation — the import is
 * inside a function body that's only called when a db method is first accessed.
 *
 * The Proxy preserves the `import { db }` API so existing callers don't need
 * changes. All production callers use `await db.execute(...)`, `await db.select(...)`,
 * etc., which work transparently through the Proxy's async getter.
 */

import type { PgDatabase } from "drizzle-orm/pg-core";
import type { NeonQueryResultHKT } from "drizzle-orm/neon-serverless";
import { env } from "@/env";
import * as schema from "./schema";

export type DrizzleClient = PgDatabase<NeonQueryResultHKT, typeof schema>;

let clientInstance: DrizzleClient | undefined;
let initPromise: Promise<DrizzleClient> | undefined;

async function initDb(): Promise<DrizzleClient> {
  if (clientInstance) return clientInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (env.DEPLOYMENT_TARGET === "cloudflare") {
      const { drizzle } = await import("drizzle-orm/neon-serverless");
      const { Pool } = await import("@neondatabase/serverless");
      const pool = new Pool({
        connectionString: env.DATABASE_URL,
        poolQueryViaFetch: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      clientInstance = drizzle({ client: pool, schema });
    } else {
      const { getNodeDb } = await import("./client.node");
      clientInstance = await getNodeDb();
    }
    return clientInstance;
  })();

  return initPromise;
}

// Proxy that lazily initializes db on first method call.
// This preserves the `import { db }` API for all existing callers.
export const db = new Proxy<DrizzleClient>({} as DrizzleClient, {
  get(_, prop) {
    if (prop === "then") {
      // Allow `await db` — resolves to the initialized DrizzleClient
      return (resolve: (v: DrizzleClient) => void) => initDb().then(resolve);
    }
    // All method calls (select, execute, insert, etc.) go through here.
    // The caller awaits the result, so returning a Promise is transparent.
    return (...args: unknown[]) => {
      return initDb().then((dbInstance) => {
        const value = (dbInstance as unknown as Record<string | symbol, unknown>)[prop];
        if (typeof value === "function") {
          return value.apply(dbInstance, args);
        }
        return value;
      });
    };
  },
});
