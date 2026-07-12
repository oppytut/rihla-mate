import type { PgDatabase } from "drizzle-orm/pg-core";
import type { NeonQueryResultHKT } from "drizzle-orm/neon-serverless";
import { env } from "@/env";
import * as schema from "./schema";

type DrizzleClient = PgDatabase<NeonQueryResultHKT, typeof schema>;

let db: DrizzleClient;

if (env.DEPLOYMENT_TARGET === "cloudflare") {
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  const { Pool } = await import("@neondatabase/serverless");
  const pool = new Pool({ connectionString: env.DATABASE_URL });
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
