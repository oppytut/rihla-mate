import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./client";
import { logger } from "@/lib/utils/logger";

async function main() {
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations complete.");
  process.exit(0);
}

main().catch((err) => {
  logger.error("Migration failed:", { component: "migrate" }, err);
  process.exit(1);
});
