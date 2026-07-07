import { z } from "zod";
import { eq, count, sum, desc, and, gte } from "drizzle-orm";
import { createTRPCRouter, adminProcedure } from "../init";
import { bookings } from "@/lib/db/schema/bookings";
import { packages } from "@/lib/db/schema/packages";

export const analyticsRouter = createTRPCRouter({
  summary: adminProcedure
    .input(
      z
        .object({
          days: z.number().int().min(1).max(365).default(30),
        })
        .optional()
        .default({ days: 30 }),
    )
    .query(async ({ ctx, input }) => {
      const { days } = input;
      const since = new Date();
      since.setDate(since.getDate() - days);

      const [
        bookingsCountResult,
        revenueResult,
        paidRevenueResult,
        pendingRevenueResult,
        packagesCountResult,
        packagesByCategoryResult,
        recentBookingsResult,
      ] = await Promise.allSettled([
        ctx.db.select({ count: count() }).from(bookings).where(gte(bookings.createdAt, since)),
        ctx.db
          .select({ total: sum(bookings.totalPrice) })
          .from(bookings)
          .where(gte(bookings.createdAt, since)),
        ctx.db
          .select({ total: sum(bookings.totalPrice) })
          .from(bookings)
          .where(and(gte(bookings.createdAt, since), eq(bookings.status, "paid"))),
        ctx.db
          .select({ total: sum(bookings.totalPrice) })
          .from(bookings)
          .where(and(gte(bookings.createdAt, since), eq(bookings.status, "pending"))),
        ctx.db.select({ count: count() }).from(packages).where(eq(packages.status, "published")),
        ctx.db
          .select({
            category: packages.category,
            count: count(),
          })
          .from(packages)
          .where(eq(packages.status, "published"))
          .groupBy(packages.category)
          .orderBy(desc(count())),
        ctx.db
          .select({
            id: bookings.id,
            customerName: bookings.customerName,
            totalPrice: bookings.totalPrice,
            status: bookings.status,
            travelers: bookings.travelers,
            createdAt: bookings.createdAt,
          })
          .from(bookings)
          .orderBy(desc(bookings.createdAt))
          .limit(10),
      ]);

      const totalBookings =
        bookingsCountResult.status === "fulfilled" ? (bookingsCountResult.value[0]?.count ?? 0) : 0;

      const totalRevenue =
        revenueResult.status === "fulfilled" ? (revenueResult.value[0]?.total ?? "0") : "0";

      const paidRevenue =
        paidRevenueResult.status === "fulfilled" ? (paidRevenueResult.value[0]?.total ?? "0") : "0";

      const pendingRevenue =
        pendingRevenueResult.status === "fulfilled"
          ? (pendingRevenueResult.value[0]?.total ?? "0")
          : "0";

      const publishedPackages =
        packagesCountResult.status === "fulfilled" ? (packagesCountResult.value[0]?.count ?? 0) : 0;

      const packagesByCategory =
        packagesByCategoryResult.status === "fulfilled" ? packagesByCategoryResult.value : [];

      const recentBookings =
        recentBookingsResult.status === "fulfilled" ? recentBookingsResult.value : [];

      return {
        totalBookings,
        totalRevenue: String(totalRevenue),
        paidRevenue: String(paidRevenue),
        pendingRevenue: String(pendingRevenue),
        publishedPackages,
        packagesByCategory,
        recentBookings,
        periodDays: days,
      };
    }),
});
