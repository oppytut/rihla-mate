/**
 * Database client factory — returns the correct Drizzle ORM instance
 * based on the deployment target.
 *
 * VPS (default): Uses `drizzle-orm/node-postgres` + `pg` Pool (node-postgres).
 * Cloudflare Workers: Uses `drizzle-orm/neon-serverless` + `@neondatabase/serverless`
 *   Pool with HTTP query mode (`poolQueryViaFetch: true`).
 *
 * On Workers, `@neondatabase/serverless` uses HTTP fetch requests instead of
 * WebSockets, which is compatible with the Workers runtime. The Pool must be
 * created per-request on Workers (WebSocket connections can't outlive a single
 * request), but since Drizzle ORM manages the lifecycle internally and we use
 * HTTP mode, module-scope Pool is safe.
 */

import type { PgDatabase } from "drizzle-orm/pg-core";
import type { NeonQueryResultHKT } from "drizzle-orm/neon-serverless";
import { env } from "@/env";
import * as schema from "./schema";

export type DrizzleClient = PgDatabase<NeonQueryResultHKT, typeof schema>;

let db: DrizzleClient;

if (env.DEPLOYMENT_TARGET === "cloudflare") {
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  const { Pool } = await import("@neondatabase/serverless");
  // HTTP query mode: uses fetch() instead of WebSockets, compatible with Workers.
  // See: https://github.com/neondatabase/serverless/blob/main/CONFIG.md
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    poolQueryViaFetch: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Pool constructor accepts poolQueryViaFetch at runtime
  } as any);
  db = drizzle({ client: pool, schema });
} else {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { Pool } = await import("pg");
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
  });
  db = drizzle(pool, { schema });
}

export { db };
