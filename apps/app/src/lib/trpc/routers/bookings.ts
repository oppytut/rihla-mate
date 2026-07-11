import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, ilike, and, count, desc, sql } from "drizzle-orm";
import { createTRPCRouter, adminProcedure, publicProcedure } from "../init";
import { bookings } from "@/lib/db/schema/bookings";
import { packages } from "@/lib/db/schema/packages";
import { logger } from "@/lib/utils/logger";
import { sendBookingConfirmation } from "@/lib/email/booking";

import { BOOKING_STATUSES } from "@/lib/utils/constants";

export { BOOKING_STATUSES };

/**
 * Normalize jsonb `availableDates` to a plain string array.
 * Drizzle/node-postgres may return jsonb columns as raw JSON strings or
 * already-parsed arrays depending on driver/connection state, so we handle
 * both to avoid intermittent "date not available" validation failures.
 */
function normalizeAvailableDates(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as string[];
    } catch (err) {
      logger.error(
        "[bookings] Failed to parse availableDates JSON:",
        { component: "bookings" },
        err,
      );
    }
  }
  logger.error("[bookings] Unexpected availableDates type:", {
    component: "bookings",
    type: typeof raw,
    value: raw,
  });
  return [];
}

const bookingsUpdateSchema = z.object({
  id: z.string().uuid(),
  packageId: z.string().uuid().optional(),
  departureDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  customerName: z.string().min(1).max(255).optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerPhone: z.string().max(50).optional().or(z.literal("")),
  travelers: z.number().int().min(1).optional(),
  totalPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Invalid price format")
    .optional(),
  status: z.enum(BOOKING_STATUSES).optional(),
  paymentRef: z.string().max(255).optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const bookingsRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.string().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { search, status, page, limit } = input;
      const offset = (page - 1) * limit;

      const conditions = [];

      if (search) {
        conditions.push(ilike(bookings.customerName, `%${search}%`));
      }

      if (status) {
        conditions.push(eq(bookings.status, status));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [itemsResult, countResult] = await Promise.allSettled([
        ctx.db
          .select({
            id: bookings.id,
            packageId: bookings.packageId,
            departureDate: bookings.departureDate,
            customerName: bookings.customerName,
            customerEmail: bookings.customerEmail,
            customerPhone: bookings.customerPhone,
            travelers: bookings.travelers,
            totalPrice: bookings.totalPrice,
            status: bookings.status,
            paymentRef: bookings.paymentRef,
            notes: bookings.notes,
            createdAt: bookings.createdAt,
            paymentToken: bookings.midtransOrderId,
            transactionId: bookings.midtransTransactionId,
            paymentMethod: bookings.paymentMethod,
            grossAmount: bookings.grossAmount,
            paymentStatus: bookings.transactionStatus,
            redirectUrl: sql<string | null>`NULL`,
            paidAt: sql<string | null>`NULL`,
            packageTitle: packages.title,
          })
          .from(bookings)
          .leftJoin(packages, eq(bookings.packageId, packages.id))
          .where(where)
          .orderBy(desc(bookings.createdAt), desc(bookings.id))
          .limit(limit)
          .offset(offset),
        ctx.db.select({ count: count() }).from(bookings).where(where),
      ]);

      if (itemsResult.status === "rejected") {
        const err = itemsResult.reason;
        const dbError = err instanceof Error ? err.message : String(err);
        logger.error("[bookings.list] items query rejected", {
          component: "bookings",
          error: dbError,
          stack: err instanceof Error ? (err.stack ?? undefined) : undefined,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch bookings: ${dbError}`,
          cause: itemsResult.reason,
        });
      }

      if (countResult.status === "rejected") {
        const err = countResult.reason;
        const dbError = err instanceof Error ? err.message : String(err);
        logger.error("[bookings.list] count query rejected", {
          component: "bookings",
          error: dbError,
          stack: err instanceof Error ? (err.stack ?? undefined) : undefined,
        });
      }

      const rawItems = itemsResult.value;
      const items = rawItems.map((i) => ({
        ...i,
        midtransOrderId: i.paymentToken,
        transactionStatus: i.paymentStatus,
      }));
      const total = countResult.status === "fulfilled" ? (countResult.value[0]?.count ?? 0) : 0;

      return { items, total, page, limit };
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select({
          id: bookings.id,
          packageId: bookings.packageId,
          departureDate: bookings.departureDate,
          customerName: bookings.customerName,
          customerEmail: bookings.customerEmail,
          customerPhone: bookings.customerPhone,
          travelers: bookings.travelers,
          totalPrice: bookings.totalPrice,
          status: bookings.status,
          paymentRef: bookings.paymentRef,
          notes: bookings.notes,
          createdAt: bookings.createdAt,
          updatedAt: bookings.updatedAt,
          paymentToken: bookings.midtransOrderId,
          transactionId: bookings.midtransTransactionId,
          paymentMethod: bookings.paymentMethod,
          grossAmount: bookings.grossAmount,
          paymentStatus: bookings.transactionStatus,
          redirectUrl: sql<string | null>`NULL`,
          paidAt: sql<string | null>`NULL`,
          packageTitle: packages.title,
        })
        .from(bookings)
        .leftJoin(packages, eq(bookings.packageId, packages.id))
        .where(eq(bookings.id, input.id))
        .limit(1);

      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }

      const raw = result[0];
      return {
        ...raw,
        midtransOrderId: raw.paymentToken,
        transactionStatus: raw.paymentStatus,
      };
    }),

  create: adminProcedure
    .input(
      z.object({
        packageId: z.string().uuid(),
        departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
        customerName: z.string().min(1).max(255),
        customerEmail: z.string().email().optional().or(z.literal("")),
        customerPhone: z.string().max(50).optional().or(z.literal("")),
        travelers: z.number().int().min(1).default(1),
        totalPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
        status: z.enum(BOOKING_STATUSES).default("pending"),
        paymentRef: z.string().max(255).optional().or(z.literal("")),
        notes: z.string().optional().or(z.literal("")),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const pkg = await ctx.db
        .select({ id: packages.id, availableDates: packages.availableDates })
        .from(packages)
        .where(eq(packages.id, input.packageId))
        .limit(1);

      if (pkg.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Package not found",
        });
      }

      const availableDates = normalizeAvailableDates(pkg[0].availableDates);
      if (!availableDates.includes(input.departureDate)) {
        logger.error("[bookings.create] date validation failed", {
          component: "bookings",
          packageId: input.packageId,
          departureDate: input.departureDate,
          availableDates,
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Selected departure date is not available for this package",
        });
      }

      const conflict = await ctx.db
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.packageId, input.packageId),
            eq(bookings.departureDate, input.departureDate),
          ),
        )
        .limit(1);

      if (conflict.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A booking already exists for this package on the selected date",
        });
      }

      const result = await ctx.db
        .insert(bookings)
        .values({
          packageId: input.packageId,
          departureDate: input.departureDate,
          customerName: input.customerName,
          customerEmail: input.customerEmail || null,
          customerPhone: input.customerPhone || null,
          travelers: input.travelers,
          totalPrice: input.totalPrice,
          status: input.status,
          paymentRef: input.paymentRef || null,
          notes: input.notes || null,
        })
        .returning();

      return result[0];
    }),

  createPublic: publicProcedure
    .input(
      z.object({
        packageId: z.string().uuid(),
        departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
        customerName: z.string().min(1).max(255),
        customerEmail: z.string().email().optional().or(z.literal("")),
        customerPhone: z.string().max(50).optional().or(z.literal("")),
        travelers: z.number().int().min(1).default(1),
        notes: z.string().optional().or(z.literal("")),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const pkg = await ctx.db
        .select({
          id: packages.id,
          price: packages.price,
          availableDates: packages.availableDates,
          title: packages.title,
        })
        .from(packages)
        .where(eq(packages.id, input.packageId))
        .limit(1);

      if (pkg.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Package not found",
        });
      }

      const availableDates = normalizeAvailableDates(pkg[0].availableDates);
      if (!availableDates.includes(input.departureDate)) {
        logger.error("[bookings.createPublic] date validation failed", {
          component: "bookings",
          packageId: input.packageId,
          departureDate: input.departureDate,
          availableDates,
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Selected departure date is not available for this package",
        });
      }

      const conflict = await ctx.db
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.packageId, input.packageId),
            eq(bookings.departureDate, input.departureDate),
          ),
        )
        .limit(1);

      if (conflict.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A booking already exists for this package on the selected date",
        });
      }

      const totalPrice = (parseFloat(pkg[0].price) * input.travelers).toFixed(2);

      const result = await ctx.db
        .insert(bookings)
        .values({
          packageId: input.packageId,
          departureDate: input.departureDate,
          customerName: input.customerName,
          customerEmail: input.customerEmail || null,
          customerPhone: input.customerPhone || null,
          travelers: input.travelers,
          totalPrice,
          status: "pending",
          paymentRef: null,
          notes: input.notes || null,
        })
        .returning();

      void sendBookingConfirmation(
        {
          customerName: input.customerName,
          customerEmail: input.customerEmail || "",
          packageTitle: pkg[0].title,
          departureDate: input.departureDate,
          travelers: input.travelers,
          totalPrice,
          bookingId: result[0].id,
        },
        "id",
      );

      return result[0];
    }),

  update: adminProcedure.input(bookingsUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const existing = await ctx.db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Booking not found",
      });
    }

    if (data.packageId !== undefined || data.departureDate !== undefined) {
      const targetPackageId =
        data.packageId ??
        (
          await ctx.db
            .select({ packageId: bookings.packageId })
            .from(bookings)
            .where(eq(bookings.id, id))
            .limit(1)
        )[0].packageId;

      const pkg = await ctx.db
        .select({ id: packages.id, availableDates: packages.availableDates })
        .from(packages)
        .where(eq(packages.id, targetPackageId))
        .limit(1);

      if (pkg.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Package not found",
        });
      }

      if (data.departureDate !== undefined) {
        const availableDates = normalizeAvailableDates(pkg[0].availableDates);
        if (!availableDates.includes(data.departureDate)) {
          logger.error("[bookings.update] date validation failed", {
            component: "bookings",
            packageId: targetPackageId,
            departureDate: data.departureDate,
            availableDates,
          });
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected departure date is not available for this package",
          });
        }

        const conflict = await ctx.db
          .select({ id: bookings.id })
          .from(bookings)
          .where(
            and(
              eq(bookings.packageId, targetPackageId),
              eq(bookings.departureDate, data.departureDate),
            ),
          )
          .limit(1);

        if (conflict.length > 0 && conflict[0].id !== id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A booking already exists for this package on the selected date",
          });
        }
      }
    }

    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        updateData[key] = value === "" ? null : value;
      }
    }

    const result = await ctx.db
      .update(bookings)
      .set(updateData)
      .where(eq(bookings.id, id))
      .returning();

    return result[0];
  }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ id: bookings.id })
        .from(bookings)
        .where(eq(bookings.id, input.id))
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }

      await ctx.db.delete(bookings).where(eq(bookings.id, input.id));

      return { success: true };
    }),
});
