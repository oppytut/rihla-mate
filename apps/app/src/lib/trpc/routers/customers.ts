import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, ilike, and, count, desc, sql, type SQLWrapper } from "drizzle-orm";
import { createTRPCRouter, adminProcedure } from "../init";
import { bookings } from "@/lib/db/schema/bookings";

export const customersRouter = createTRPCRouter({
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

      const conditions: SQLWrapper[] = [];

      if (search) {
        conditions.push(
          sql`(${ilike(bookings.customerName, `%${search}%`)} or ${ilike(bookings.customerEmail, `%${search}%`)})`,
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [itemsResult, countResult] = await Promise.allSettled([
        ctx.db
          .select({
            customerName: bookings.customerName,
            customerEmail: bookings.customerEmail,
            customerPhone: bookings.customerPhone,
            totalBookings: count(bookings.id).as("total_bookings"),
            totalSpent: sql<string>`cast(coalesce(sum(${bookings.totalPrice}), 0) as text)`,
            lastBookingDate: sql<string>`cast(max(${bookings.createdAt}) as text)`,
          })
          .from(bookings)
          .where(where)
          .groupBy(bookings.customerName, bookings.customerEmail, bookings.customerPhone)
          .orderBy(desc(sql`max(${bookings.createdAt})`))
          .limit(limit)
          .offset(offset),
        ctx.db
          .select({
            count: sql<number>`count(distinct ${bookings.customerName})`,
          })
          .from(bookings)
          .where(where),
      ]);

      if (itemsResult.status === "rejected") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch customers",
          cause: itemsResult.reason,
        });
      }

      const items = itemsResult.value;
      const total = countResult.status === "fulfilled" ? (countResult.value[0]?.count ?? 0) : 0;

      return { items, total, page, limit };
    }),

  getBookings: adminProcedure
    .input(
      z.object({
        customerName: z.string().min(1),
        customerEmail: z.string().optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { customerName, customerEmail, page, limit } = input;
      const offset = (page - 1) * limit;

      const conditions = [eq(bookings.customerName, customerName)];
      if (customerEmail) {
        conditions.push(eq(bookings.customerEmail, customerEmail));
      }

      const [itemsResult, countResult] = await Promise.allSettled([
        ctx.db
          .select({
            id: bookings.id,
            packageId: bookings.packageId,
            departureDate: bookings.departureDate,
            travelers: bookings.travelers,
            totalPrice: bookings.totalPrice,
            status: bookings.status,
            createdAt: bookings.createdAt,
          })
          .from(bookings)
          .where(and(...conditions))
          .orderBy(desc(bookings.createdAt))
          .limit(limit)
          .offset(offset),
        ctx.db
          .select({ count: count() })
          .from(bookings)
          .where(and(...conditions)),
      ]);

      if (itemsResult.status === "rejected") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch customer bookings",
          cause: itemsResult.reason,
        });
      }

      const items = itemsResult.value;
      const total = countResult.status === "fulfilled" ? (countResult.value[0]?.count ?? 0) : 0;

      return { items, total, page, limit };
    }),
});
