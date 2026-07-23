/**
 * Neon-capable migrator for CI / Cloudflare deploys.
 *
 * Uses drizzle-orm/neon-http (HTTP) so it works against Neon from GitHub Actions
 * without a TCP `pg` dependency. Local VPS/Postgres CI continues to use
 * `drizzle-kit migrate` via package.json `db:migrate`.
 */
import { migrate } from "drizzle-orm/neon-http/migrator";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  // Prefer direct (non-pooler) URL for migrations when provided.
  const migrateUrl = process.env.DATABASE_URL_UNPOOLED ?? databaseUrl;

  const sql = neon(migrateUrl);
  const db = drizzle(sql);

  const here = dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = resolve(here, "../../../drizzle");

  console.log(`Running app migrations from ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log("Migrations complete.");
}

const isMainModule =
  process.argv[1]?.endsWith("migrate.ts") || process.argv[1]?.endsWith("migrate.js");
if (isMainModule) {
  main().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}
