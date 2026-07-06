import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { createTRPCRouter, adminProcedure } from "../init";
import { settings } from "@/lib/db/schema/settings";

export const settingsRouter = createTRPCRouter({
  list: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.select().from(settings).orderBy(settings.key);
    const map: Record<string, unknown> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return map;
  }),

  get: adminProcedure
    .input(z.object({ key: z.string().min(1).max(255) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.select().from(settings).where(eq(settings.key, input.key)).limit(1);
      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Setting not found" });
      }
      return rows[0];
    }),

  set: adminProcedure
    .input(
      z.object({
        key: z.string().min(1).max(255),
        value: z.any(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ key: settings.key })
        .from(settings)
        .where(eq(settings.key, input.key))
        .limit(1);

      if (existing.length > 0) {
        const result = await ctx.db
          .update(settings)
          .set({ value: input.value, updatedAt: new Date() })
          .where(eq(settings.key, input.key))
          .returning();
        return result[0];
      }

      const result = await ctx.db
        .insert(settings)
        .values({ key: input.key, value: input.value })
        .returning();
      return result[0];
    }),

  delete: adminProcedure
    .input(z.object({ key: z.string().min(1).max(255) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ key: settings.key })
        .from(settings)
        .where(eq(settings.key, input.key))
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Setting not found" });
      }

      await ctx.db.delete(settings).where(eq(settings.key, input.key));
      return { success: true };
    }),
});
