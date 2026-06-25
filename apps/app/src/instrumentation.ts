import { scheduleCheckIn } from "@/lib/license/checkin";
import { db } from "@/lib/db/client";
import { isLicenseValid, licenseKeys } from "@/lib/license/store";
import { env } from "@/env";
import { and, isNull, or, gt, sql } from "drizzle-orm";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    (async () => {
      let licenseKey: string | undefined = env.LICENSE_KEY;

      if (!licenseKey) {
        const [row] = await db
          .select({ key: licenseKeys.key })
          .from(licenseKeys)
          .where(
            and(
              isNull(licenseKeys.revokedAt),
              or(
                isNull(licenseKeys.expiresAt),
                gt(licenseKeys.expiresAt, sql`now()`),
              ),
            ),
          )
          .limit(1);

        if (row) {
          licenseKey = row.key;
        }
      }

      if (licenseKey && (await isLicenseValid(db, licenseKey))) {
        const scheduler = scheduleCheckIn(db, licenseKey);
        console.log("[Instrumentation] License check-in scheduled every 24h");

        const shutdown = () => {
          scheduler.stop();
          console.log("[Instrumentation] License check-in stopped");
        };

        process.on("SIGTERM", shutdown);
        process.on("SIGINT", shutdown);
        process.on("beforeExit", shutdown);
      } else {
        console.log("[Instrumentation] No active license — check-in skipped");
      }
    })();
  }
}
