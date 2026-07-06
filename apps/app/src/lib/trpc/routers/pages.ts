import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, count } from "drizzle-orm";
import { createTRPCRouter, adminProcedure, publicProcedure } from "../init";
import { pages } from "@/lib/db/schema/pages";

const pagesInsertSchema = z.object({
  templateId: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  title: z.string().min(1).max(255),
  content: z.record(z.unknown()).optional().default({}),
  seo: z
    .object({
      title: z.string().max(255).optional(),
      description: z.string().max(500).optional(),
      ogImage: z.string().max(500).optional(),
    })
    .optional()
    .default({}),
  isPublished: z.boolean().optional().default(false),
  isHomepage: z.boolean().optional().default(false),
});

const pagesUpdateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional(),
  content: z.record(z.unknown()).optional(),
  seo: z
    .object({
      title: z.string().max(255).optional(),
      description: z.string().max(500).optional(),
      ogImage: z.string().max(500).optional(),
    })
    .optional(),
  isPublished: z.boolean().optional(),
  isHomepage: z.boolean().optional(),
});

export const pagesRouter = createTRPCRouter({
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
        ctx.db
          .select({
            id: pages.id,
            templateId: pages.templateId,
            slug: pages.slug,
            title: pages.title,
            isPublished: pages.isPublished,
            isHomepage: pages.isHomepage,
            publishedAt: pages.publishedAt,
            createdAt: pages.createdAt,
            updatedAt: pages.updatedAt,
          })
          .from(pages)
          .orderBy(desc(pages.updatedAt))
          .limit(limit)
          .offset(offset),
        ctx.db.select({ count: count() }).from(pages),
      ]);

      if (itemsResult.status === "rejected") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch pages",
          cause: itemsResult.reason,
        });
      }

      const items = itemsResult.value;
      const total = countResult.status === "fulfilled" ? (countResult.value[0]?.count ?? 0) : 0;

      return { items, total, page, limit };
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.select().from(pages).where(eq(pages.id, input.id)).limit(1);
      if (result.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }
      return result[0];
    }),

  getBySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ ctx, input }) => {
    const result = await ctx.db.select().from(pages).where(eq(pages.slug, input.slug)).limit(1);
    if (result.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
    }
    return result[0];
  }),

  create: adminProcedure.input(pagesInsertSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.slug, input.slug))
      .limit(1);

    if (existing.length > 0) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "A page with this slug already exists",
      });
    }

    const result = await ctx.db.insert(pages).values(input).returning();
    return result[0];
  }),

  update: adminProcedure.input(pagesUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const existing = await ctx.db
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.id, id))
      .limit(1);
    if (existing.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
    }

    if (data.slug) {
      const slugConflict = await ctx.db
        .select({ id: pages.id })
        .from(pages)
        .where(eq(pages.slug, data.slug))
        .limit(1);
      if (slugConflict.length > 0 && slugConflict[0].id !== id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A page with this slug already exists",
        });
      }
    }

    const updateData: Record<string, unknown> = { ...data };
    if (data.isPublished && !existing[0]) {
      updateData.publishedAt = new Date().toISOString();
    }

    const result = await ctx.db.update(pages).set(updateData).where(eq(pages.id, id)).returning();
    return result[0];
  }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ id: pages.id })
        .from(pages)
        .where(eq(pages.id, input.id))
        .limit(1);
      if (existing.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }

      await ctx.db.delete(pages).where(eq(pages.id, input.id));
      return { success: true };
    }),
});
