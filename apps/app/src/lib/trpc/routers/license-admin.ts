import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { ilike, and, desc, count, isNull, or, gt, sql } from "drizzle-orm";
import { createTRPCRouter, adminProcedure } from "../init";
import {
  licenseKeys,
  getLicenseByKey,
  revokeLicense,
  invalidateLicenseCache,
} from "@/lib/license/store";
import { logger } from "@/lib/utils/logger";

export const licenseAdminRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { search, page, limit } = input;
      const offset = (page - 1) * limit;

      const conditions = [];

      if (search) {
        conditions.push(ilike(licenseKeys.key, `%${search}%`));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [itemsResult, countResult] = await Promise.allSettled([
        ctx.db
          .select({
            id: licenseKeys.id,
            key: licenseKeys.key,
            type: licenseKeys.type,
            seats: licenseKeys.seats,
            issuedAt: licenseKeys.issuedAt,
            expiresAt: licenseKeys.expiresAt,
            revokedAt: licenseKeys.revokedAt,
            metadata: licenseKeys.metadata,
          })
          .from(licenseKeys)
          .where(where)
          .orderBy(desc(licenseKeys.issuedAt), desc(licenseKeys.id))
          .limit(limit)
          .offset(offset),
        ctx.db.select({ count: count() }).from(licenseKeys).where(where),
      ]);

      if (itemsResult.status === "rejected") {
        const err = itemsResult.reason;
        const dbError = err instanceof Error ? err.message : String(err);
        logger.error("[licenseAdmin.list] items query rejected", {
          component: "licenseAdmin",
          error: dbError,
          stack: err instanceof Error ? (err.stack ?? undefined) : undefined,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch licenses: ${dbError}`,
          cause: itemsResult.reason,
        });
      }

      if (countResult.status === "rejected") {
        const err = countResult.reason;
        const dbError = err instanceof Error ? err.message : String(err);
        logger.error("[licenseAdmin.list] count query rejected", {
          component: "licenseAdmin",
          error: dbError,
          stack: err instanceof Error ? (err.stack ?? undefined) : undefined,
        });
      }

      const items = itemsResult.value;
      const total = countResult.status === "fulfilled" ? (countResult.value[0]?.count ?? 0) : 0;

      return { items, total, page, limit };
    }),

  getStatus: adminProcedure.query(async ({ ctx }) => {
    const [activeCountResult, totalCountResult] = await Promise.allSettled([
      ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(licenseKeys)
        .where(
          and(
            isNull(licenseKeys.revokedAt),
            or(isNull(licenseKeys.expiresAt), gt(licenseKeys.expiresAt, sql`now()`)),
          ),
        ),
      ctx.db.select({ count: count() }).from(licenseKeys),
    ]);

    const active =
      activeCountResult.status === "fulfilled" ? (activeCountResult.value[0]?.count ?? 0) : 0;
    const total =
      totalCountResult.status === "fulfilled" ? (totalCountResult.value[0]?.count ?? 0) : 0;

    return { active, total };
  }),

  revoke: adminProcedure
    .input(z.object({ key: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getLicenseByKey(ctx.db, input.key);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "License key not found",
        });
      }

      if (existing.revokedAt) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "License key is already revoked",
        });
      }

      const revoked = await revokeLicense(ctx.db, input.key);
      invalidateLicenseCache(input.key);

      return revoked;
    }),
});
