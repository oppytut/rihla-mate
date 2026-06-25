import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull, or, gt, sql } from "drizzle-orm";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../init";
import { startTrial } from "@/lib/license/trial";
import { checkIn } from "@/lib/license/checkin";
import { licenseKeys } from "@/lib/license/store";

export const licenseRouter = createTRPCRouter({
  startTrial: publicProcedure
    .input(z.object({ instanceId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const ipAddress =
        ctx.headers.get("x-forwarded-for") ?? "unknown";

      // Check if this instance already has an active trial
      const existingTrials = await ctx.db
        .select({ id: licenseKeys.id })
        .from(licenseKeys)
        .where(
          and(
            eq(licenseKeys.type, "trial"),
            isNull(licenseKeys.revokedAt),
            or(
              isNull(licenseKeys.expiresAt),
              gt(licenseKeys.expiresAt, sql`now()`),
            ),
            eq(
              sql`${licenseKeys.metadata}->>'instanceId'`,
              input.instanceId,
            ),
          ),
        )
        .limit(1);

      if (existingTrials.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already have an active trial",
        });
      }

      const key = await startTrial(ctx.db, {
        instanceId: input.instanceId,
        ipAddress,
      });

      return { key };
    }),

  activate: publicProcedure
    .input(z.object({ licenseKey: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await checkIn(ctx.db, input.licenseKey);

      if (!result.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: result.reason ?? "Invalid license key",
        });
      }

      return result;
    }),
});
