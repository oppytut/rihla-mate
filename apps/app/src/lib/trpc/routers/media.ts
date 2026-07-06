import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, count } from "drizzle-orm";
import { createTRPCRouter, adminProcedure } from "../init";
import { media } from "@/lib/db/schema/media";

export const mediaRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, limit } = input;
      const offset = (page - 1) * limit;

      const [itemsResult, countResult] = await Promise.allSettled([
        ctx.db.select().from(media).orderBy(desc(media.createdAt)).limit(limit).offset(offset),
        ctx.db.select({ count: count() }).from(media),
      ]);

      if (itemsResult.status === "rejected") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch media",
          cause: itemsResult.reason,
        });
      }

      const items = itemsResult.value;
      const total = countResult.status === "fulfilled" ? (countResult.value[0]?.count ?? 0) : 0;

      return { items, total, page, limit };
    }),

  create: adminProcedure
    .input(
      z.object({
        filename: z.string().min(1).max(255),
        originalName: z.string().min(1).max(255),
        mimeType: z.string().min(1).max(100),
        sizeBytes: z.number().int().min(0),
        altText: z.string().optional(),
        width: z.number().int().optional(),
        height: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.insert(media).values(input).returning();
      return result[0];
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        altText: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const existing = await ctx.db
        .select({ id: media.id })
        .from(media)
        .where(eq(media.id, id))
        .limit(1);
      if (existing.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Media not found",
        });
      }

      const result = await ctx.db.update(media).set(data).where(eq(media.id, id)).returning();
      return result[0];
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ id: media.id })
        .from(media)
        .where(eq(media.id, input.id))
        .limit(1);
      if (existing.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Media not found",
        });
      }

      await ctx.db.delete(media).where(eq(media.id, input.id));
      return { success: true };
    }),
});
