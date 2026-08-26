import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "../init";
import { settings } from "@/lib/db/schema/settings";
import { BUREAU_HOME_SECTIONS_KEY, parseBureauHomeSections } from "@/lib/bureau-home-sections";

export const settingsRouter = createTRPCRouter({
  getHomeSections: protectedProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select()
      .from(settings)
      .where(eq(settings.key, BUREAU_HOME_SECTIONS_KEY))
      .limit(1);
    return parseBureauHomeSections(row?.value);
  }),

  setHomeSections: protectedProcedure.input(z.any()).mutation(async ({ ctx, input }) => {
    const value = parseBureauHomeSections(input);
    const existing = await ctx.db
      .select({ key: settings.key })
      .from(settings)
      .where(eq(settings.key, BUREAU_HOME_SECTIONS_KEY))
      .limit(1);

    if (existing.length > 0) {
      const result = await ctx.db
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, BUREAU_HOME_SECTIONS_KEY))
        .returning();
      return parseBureauHomeSections(result[0]?.value);
    }

    const result = await ctx.db
      .insert(settings)
      .values({ key: BUREAU_HOME_SECTIONS_KEY, value })
      .returning();
    return parseBureauHomeSections(result[0]?.value);
  }),

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
