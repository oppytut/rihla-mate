import { eq, count, sum, sql, desc } from "drizzle-orm";
import { createTRPCRouter, adminProcedure } from "../init";
import { bookings } from "@/lib/db/schema/bookings";
import { packages } from "@/lib/db/schema/packages";

export const dashboardRouter = createTRPCRouter({
  stats: adminProcedure.query(async ({ ctx }) => {
    const [
      totalBookingsResult,
      activePackagesResult,
      totalCustomersResult,
      revenueResult,
      pendingBookingsResult,
      recentBookingsResult,
    ] = await Promise.allSettled([
      ctx.db.select({ count: count() }).from(bookings),
      ctx.db.select({ count: count() }).from(packages).where(eq(packages.status, "published")),
      ctx.db
        .select({ count: sql<number>`cast(count(distinct ${bookings.customerName}) as int)` })
        .from(bookings),
      ctx.db
        .select({ total: sum(bookings.totalPrice) })
        .from(bookings)
        .where(eq(bookings.status, "paid")),
      ctx.db.select({ count: count() }).from(bookings).where(eq(bookings.status, "pending")),
      ctx.db
        .select({
          id: bookings.id,
          customerName: bookings.customerName,
          totalPrice: bookings.totalPrice,
          status: bookings.status,
          travelers: bookings.travelers,
          createdAt: bookings.createdAt,
          packageTitle: packages.title,
        })
        .from(bookings)
        .leftJoin(packages, eq(bookings.packageId, packages.id))
        .orderBy(desc(bookings.createdAt))
        .limit(5),
    ]);

    const totalBookings =
      totalBookingsResult.status === "fulfilled" ? (totalBookingsResult.value[0]?.count ?? 0) : 0;
    const activePackages =
      activePackagesResult.status === "fulfilled" ? (activePackagesResult.value[0]?.count ?? 0) : 0;
    const totalCustomers =
      totalCustomersResult.status === "fulfilled" ? (totalCustomersResult.value[0]?.count ?? 0) : 0;
    const revenue =
      revenueResult.status === "fulfilled" ? (revenueResult.value[0]?.total ?? "0") : "0";
    const pendingBookings =
      pendingBookingsResult.status === "fulfilled"
        ? (pendingBookingsResult.value[0]?.count ?? 0)
        : 0;
    const recentBookings =
      recentBookingsResult.status === "fulfilled" ? recentBookingsResult.value : [];

    return {
      totalBookings,
      activePackages,
      totalCustomers,
      revenue: String(revenue),
      pendingBookings,
      recentBookings,
    };
  }),
});
