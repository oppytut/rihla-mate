/**
 * Neon-capable migrator for CI / Cloudflare deploys.
 *
 * Uses drizzle-orm/neon-http (HTTP) so it works against Neon from GitHub Actions
 * without a TCP `pg` dependency. Local VPS/Postgres CI continues to use
 * `drizzle-kit migrate` via package.json `db:migrate`.
 *
 * After migrate, verifies required app tables exist. If the journal claims
 * migrations ran but tables are missing (journal drift), clears
 * drizzle.__drizzle_migrations and re-runs migrate once.
 */
import { migrate } from "drizzle-orm/neon-http/migrator";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { checkSchemaReady } from "./schema-ready";

export async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  // Prefer direct (non-pooler) URL when set. GitHub Actions injects empty string
  // for missing secrets — `??` does not fall back, so treat "" as unset.
  const unpooled = process.env.DATABASE_URL_UNPOOLED?.trim();
  const migrateUrl = unpooled || databaseUrl;

  const neonSql = neon(migrateUrl);
  const db = drizzle(neonSql);

  const here = dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = resolve(here, "../../../drizzle");

  console.log(`Running app migrations from ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log("Migrations complete.");

  console.log("Schema verify...");
  let { schemaReady, missingTables } = await checkSchemaReady(db);

  if (!schemaReady) {
    console.warn(`Schema incomplete, repairing journal... missing: ${missingTables.join(", ")}`);
    try {
      await db.execute(sql`DELETE FROM drizzle.__drizzle_migrations`);
    } catch {
      // Journal table may not exist yet; migrate will recreate it.
    }
    await migrate(db, { migrationsFolder });
    console.log("Migrations complete (repair pass).");

    console.log("Schema verify...");
    ({ schemaReady, missingTables } = await checkSchemaReady(db));
  }

  if (!schemaReady) {
    throw new Error(
      `Schema still incomplete after repair. Missing tables: ${missingTables.join(", ")}`,
    );
  }

  console.log("Schema ready.");
}

const isMainModule =
  process.argv[1]?.endsWith("migrate.ts") || process.argv[1]?.endsWith("migrate.js");
if (isMainModule) {
  main().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
}
