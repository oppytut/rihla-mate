/**
 * VPS database client — lazily imported by client.ts when DEPLOYMENT_TARGET is "vps".
 *
 * This file is in a separate module so that Turbopack does not trace the
 * `import("pg")` call during edge chunk compilation. On Cloudflare Workers,
 * this file is never loaded.
 */

import type { PgDatabase } from "drizzle-orm/pg-core";
import type { NeonQueryResultHKT } from "drizzle-orm/neon-serverless";
import { env } from "@/env";
import * as schema from "./schema";

export type DrizzleClient = PgDatabase<NeonQueryResultHKT, typeof schema>;

export async function getNodeDb(): Promise<DrizzleClient> {
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { Pool } = await import(/* turbopackIgnore: true */ "pg");
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
  });
  return drizzle(pool, { schema }) as unknown as DrizzleClient;
}
