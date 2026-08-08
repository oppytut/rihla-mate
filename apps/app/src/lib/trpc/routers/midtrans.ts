import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "../init";
import { bookings } from "@/lib/db/schema/bookings";
import { packages } from "@/lib/db/schema/packages";
import { createSnapTransaction, isMidtransConfigured } from "@/lib/payment/midtrans";
import { logger } from "@/lib/utils/logger";

export const midtransRouter = createTRPCRouter({
  /**
   * Generate a Midtrans Snap token for a booking.
   * Client calls this after creating a booking to get the token for snap.pay().
   */
  createTransaction: protectedProcedure
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

      // Existing Snap order: Snap tokens are single-use and not stored.
      // Clients should open the payment status page, not treat this as paid.
      if (b.midtransOrderId) {
        return {
          token: null,
          redirectUrl: null,
          alreadyOrdered: true as const,
          orderId: b.midtransOrderId,
        };
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

      const claimed = await ctx.db
        .update(bookings)
        .set({ midtransOrderId: orderId })
        .where(and(eq(bookings.id, input.bookingId), isNull(bookings.midtransOrderId)))
        .returning({ id: bookings.id });

      if (claimed.length === 0) {
        const again = await ctx.db
          .select({ midtransOrderId: bookings.midtransOrderId })
          .from(bookings)
          .where(eq(bookings.id, input.bookingId))
          .limit(1);
        const existingOrderId = again[0]?.midtransOrderId;
        if (existingOrderId) {
          return {
            token: null,
            redirectUrl: null,
            alreadyOrdered: true as const,
            orderId: existingOrderId,
          };
        }
        throw new TRPCError({
          code: "CONFLICT",
          message: "Could not claim payment order for booking",
        });
      }

      logger.info("[midtrans] Snap token created", {
        component: "midtrans",
        bookingId: input.bookingId,
        orderId,
      });

      return {
        token: result.token,
        redirectUrl: result.redirectUrl,
        alreadyOrdered: false as const,
        orderId,
      };
    }),
});
