import { scheduleCheckIn } from "@/lib/license/checkin";
import { logger } from "@/lib/utils/logger";
import { db, setDb, getDb } from "@/lib/db/client";
import { initVpsAuth } from "@/lib/auth";
import { isLicenseValid, licenseKeys } from "@/lib/license/store";
import { env } from "@/env";
import { and, isNull, or, gt, sql } from "drizzle-orm";

export function register() {
  // On Cloudflare Workers, Cron Triggers handle background jobs.
  // The VPS runtime uses in-process setTimeout via the abstract scheduler.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    (async () => {
      // Initialize database before any module accesses db synchronously.
      // This must happen inside register() because Next.js instrumentation
      // is the earliest hook available before any request handling.
      try {
        const resolvedDb = await getDb();
        setDb(resolvedDb);
        await initVpsAuth();
      } catch (error) {
        logger.error("Failed to initialize database or auth during instrumentation", {
          component: "instrumentation",
          error: error instanceof Error ? error.message : String(error),
        });
        return;
      }

      let licenseKey: string | undefined = env.LICENSE_KEY;

      if (!licenseKey) {
        const [row] = await db
          .select({ key: licenseKeys.key })
          .from(licenseKeys)
          .where(
            and(
              isNull(licenseKeys.revokedAt),
              or(isNull(licenseKeys.expiresAt), gt(licenseKeys.expiresAt, sql`now()`)),
            ),
          )
          .limit(1);

        if (row) {
          licenseKey = row.key;
        }
      }

      if (licenseKey && (await isLicenseValid(db, licenseKey))) {
        const scheduler = scheduleCheckIn(db, licenseKey);
        logger.info("License check-in scheduled every 24h", { component: "instrumentation" });

        // Graceful shutdown only applies on VPS (process.on is not available on Workers)
        const shutdown = () => {
          scheduler.stop();
          logger.info("License check-in stopped", { component: "instrumentation" });
        };

        process.on("SIGTERM", shutdown);
        process.on("SIGINT", shutdown);
        process.on("beforeExit", shutdown);
      } else {
        logger.info("No active license — check-in skipped", { component: "instrumentation" });
      }
    })();
  }
}
