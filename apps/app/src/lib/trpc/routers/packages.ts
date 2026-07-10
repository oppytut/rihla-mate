import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, ilike, and, count, desc } from "drizzle-orm";
import { createTRPCRouter, adminProcedure, publicProcedure } from "../init";
import { packages } from "@/lib/db/schema/packages";
import { bookings } from "@/lib/db/schema/bookings";

const JSONB_FIELDS = [
  "itinerary",
  "inclusions",
  "exclusions",
  "availableDates",
  "gallery",
] as const;

const parseJsonField = (field: string, name: string) => {
  try {
    return JSON.parse(field);
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid JSON in ${name}`,
    });
  }
};

const packagesUpdateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional(),
  description: z.string().optional(),
  durationDays: z.number().int().min(1).optional(),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid price format")
    .optional(),
  currency: z.string().length(3).optional(),
  itinerary: z.string().optional(),
  inclusions: z.string().optional(),
  exclusions: z.string().optional(),
  departureCity: z.string().max(100).optional(),
  availableDates: z.string().optional(),
  featuredImage: z.string().optional(),
  gallery: z.string().optional(),
  category: z.string().max(50).optional(),
  status: z.string().max(50).optional(),
});

export const packagesRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          status: z.string().optional(),
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(1).max(100).default(20),
        })
        .optional()
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const { search, status, page, limit } = input;
      const offset = (page - 1) * limit;

      const conditions = [];

      if (search) {
        conditions.push(ilike(packages.title, `%${search}%`));
      }

      if (status) {
        conditions.push(eq(packages.status, status));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [itemsResult, countResult] = await Promise.allSettled([
        ctx.db
          .select({
            id: packages.id,
            title: packages.title,
            slug: packages.slug,
            category: packages.category,
            durationDays: packages.durationDays,
            price: packages.price,
            currency: packages.currency,
            status: packages.status,
            createdAt: packages.createdAt,
          })
          .from(packages)
          .where(where)
          .orderBy(desc(packages.createdAt), desc(packages.id))
          .limit(limit)
          .offset(offset),
        ctx.db.select({ count: count() }).from(packages).where(where),
      ]);

      if (itemsResult.status === "rejected") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch packages",
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
      const result = await ctx.db.select().from(packages).where(eq(packages.id, input.id)).limit(1);

      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Package not found",
        });
      }

      return result[0];
    }),

  getBySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ ctx, input }) => {
    const result = await ctx.db
      .select()
      .from(packages)
      .where(eq(packages.slug, input.slug))
      .limit(1);

    if (result.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Package not found",
      });
    }

    return result[0];
  }),

  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        slug: z
          .string()
          .min(1)
          .max(255)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
        description: z.string().optional(),
        durationDays: z.number().int().min(1),
        price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
        currency: z.string().length(3).default("IDR"),
        itinerary: z.string().default("[]"),
        inclusions: z.string().default("[]"),
        exclusions: z.string().default("[]"),
        departureCity: z.string().max(100).optional(),
        availableDates: z.string().default("[]"),
        featuredImage: z.string().optional(),
        gallery: z.string().default("[]"),
        category: z.string().max(50).default("standard"),
        status: z.string().max(50).default("draft"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingSlug = await ctx.db
        .select({ id: packages.id })
        .from(packages)
        .where(eq(packages.slug, input.slug))
        .limit(1);

      if (existingSlug.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A package with this slug already exists",
        });
      }

      const jsonbValues = Object.fromEntries(
        JSONB_FIELDS.map((field) => [field, parseJsonField(input[field], field)]),
      );

      const result = await ctx.db
        .insert(packages)
        .values({ ...input, ...jsonbValues })
        .returning();

      return result[0];
    }),

  update: adminProcedure.input(packagesUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const existing = await ctx.db
      .select({ id: packages.id })
      .from(packages)
      .where(eq(packages.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Package not found",
      });
    }

    if (data.slug !== undefined) {
      const slugConflict = await ctx.db
        .select({ id: packages.id })
        .from(packages)
        .where(eq(packages.slug, data.slug))
        .limit(1);

      if (slugConflict.length > 0 && slugConflict[0].id !== id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A package with this slug already exists",
        });
      }
    }

    const parsedData: Record<string, unknown> = { ...data };
    for (const field of JSONB_FIELDS) {
      if (data[field] !== undefined) {
        parsedData[field] = parseJsonField(data[field], field);
      }
    }

    const result = await ctx.db
      .update(packages)
      .set(parsedData)
      .where(eq(packages.id, id))
      .returning();

    return result[0];
  }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ id: packages.id })
        .from(packages)
        .where(eq(packages.id, input.id))
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Package not found",
        });
      }

      const bookingCount = await ctx.db
        .select({ count: count() })
        .from(bookings)
        .where(eq(bookings.packageId, input.id));

      if ((bookingCount[0]?.count ?? 0) > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot delete package with existing bookings",
        });
      }

      await ctx.db.delete(packages).where(eq(packages.id, input.id));

      return { success: true };
    }),
});
