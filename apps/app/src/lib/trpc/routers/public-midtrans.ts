import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { createTRPCRouter, publicProcedure } from "../init";
import { bookings } from "@/lib/db/schema/bookings";
import { packages } from "@/lib/db/schema/packages";
import { createSnapTransaction, isMidtransConfigured } from "@/lib/payment/midtrans";
import { logger } from "@/lib/utils/logger";

export const publicMidtransRouter = createTRPCRouter({
  /**
   * Generate a Midtrans Snap token for a public booking.
   * Same logic as the protected midtrans router, but accessible to unauthenticated users.
   */
  createTransaction: publicProcedure
    .input(
      z.object({
        bookingId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isMidtransConfigured()) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Payment gateway is not configured",
        });
      }

      const booking = await ctx.db
        .select({
          id: bookings.id,
          packageId: bookings.packageId,
          totalPrice: bookings.totalPrice,
          status: bookings.status,
          customerName: bookings.customerName,
          customerEmail: bookings.customerEmail,
          customerPhone: bookings.customerPhone,
          midtransOrderId: bookings.midtransOrderId,
          packageTitle: packages.title,
          packagePrice: packages.price,
        })
        .from(bookings)
        .leftJoin(packages, eq(bookings.packageId, packages.id))
        .where(eq(bookings.id, input.bookingId))
        .limit(1);

      if (!booking[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Booking not found",
        });
      }

      const b = booking[0];

      if (b.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment can only be created for pending bookings",
        });
      }

      // If a Midtrans order already exists and is still pending, return it
      if (b.midtransOrderId) {
        return { token: null, redirectUrl: null };
      }

      const orderId = `RIHLA-${b.id}-${Date.now()}`;
      const grossAmount = Number(b.totalPrice);

      const result = await createSnapTransaction({
        orderId,
        grossAmount,
        items: [
          {
            id: b.packageId,
            price: grossAmount,
            quantity: 1,
            name: b.packageTitle ?? "Booking",
          },
        ],
        customer: {
          firstName: b.customerName,
          email: b.customerEmail ?? "",
          phone: b.customerPhone ?? undefined,
        },
      });

      // Store the Midtrans order ID on the booking
      await ctx.db
        .update(bookings)
        .set({ midtransOrderId: orderId })
        .where(eq(bookings.id, input.bookingId));

      logger.info("[public-midtrans] Snap token created", {
        component: "midtrans",
        bookingId: input.bookingId,
        orderId,
      });

      return {
        token: result.token,
        redirectUrl: result.redirectUrl,
      };
    }),
});
