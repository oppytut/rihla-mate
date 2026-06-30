import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./client";
import { logger } from "@/lib/utils/logger";

async function main() {
  logger.info("Running migrations...", { component: "migrate" });
  await migrate(db, { migrationsFolder: "./drizzle" });
  logger.info("Migrations complete.", { component: "migrate" });
}

const isMainModule =
  process.argv[1]?.endsWith("migrate.ts") || process.argv[1]?.endsWith("migrate.js");
if (isMainModule) {
  main().catch((err) => {
    logger.error("Migration failed", { component: "migrate" }, err);
    process.exit(1);
  });
}
