import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({ status: "ok" });
  } catch (err) {
    console.error("[health] DB ping failed:", err);
    return Response.json(
      { status: "error", message: "Database unavailable" },
      { status: 503 },
    );
  }
}
