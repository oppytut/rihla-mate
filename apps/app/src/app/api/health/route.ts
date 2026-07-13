import { getDb } from "@/lib/db/client";
import { sql } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    await db.execute(sql`SELECT 1`);
    return Response.json({ status: "ok" });
  } catch (err) {
    logger.error("DB ping failed:", { component: "health" }, err);
    return Response.json({ status: "error", message: "Database unavailable" }, { status: 503 });
  }
}
