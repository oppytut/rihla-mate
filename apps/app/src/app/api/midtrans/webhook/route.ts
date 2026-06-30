import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { bookings } from "@/lib/db/schema/bookings";
import { verifyWebhookSignature } from "@/lib/payment/midtrans";
import { logger } from "@/lib/utils/logger";

/**
 * Midtrans notification webhook handler.
 *
 * Midtrans sends POST notifications with JSON body containing:
 * - order_id, transaction_status, fraud_status, status_code,
 *   gross_amount, signature_key, payment_type, transaction_id
 *
 * Signature formula: SHA512(order_id + status_code + gross_amount + ServerKey)
 *
 * IMPORTANT: Midtrans retries with exponential backoff.
 * This handler must be idempotent.
 */
export async function POST(request: NextRequest) {
  try {
    // Read raw body first — signature verification needs exact bytes
    const rawBody = await request.text();

    let notification: Record<string, unknown>;
    try {
      notification = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      logger.error("[midtrans webhook] Invalid JSON body", {
        component: "midtrans",
      });
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      order_id: orderId,
      transaction_status: transactionStatus,
      fraud_status: fraudStatus,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signatureKey,
      payment_type: paymentType,
      transaction_id: transactionId,
    } = notification as Record<string, string | undefined>;

    if (!orderId || !transactionStatus || !statusCode || !grossAmount || !signatureKey) {
      logger.error("[midtrans webhook] Missing required fields", {
        component: "midtrans",
        fields: {
          orderId,
          transactionStatus,
          statusCode,
          grossAmount: grossAmount ? "***" : undefined,
        },
      });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(orderId, statusCode, grossAmount, signatureKey);

    if (!isValid) {
      logger.error("[midtrans webhook] Invalid signature", {
        component: "midtrans",
        orderId,
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Map Midtrans transaction status to booking status
    let bookingStatus: string;

    if (transactionStatus === "capture") {
      if (fraudStatus === "challenge") {
        bookingStatus = "pending"; // Under FDS review
      } else if (fraudStatus === "accept") {
        bookingStatus = "paid";
      } else {
        bookingStatus = "pending"; // denied — leave as pending for retry
      }
    } else if (transactionStatus === "settlement") {
      bookingStatus = "paid";
    } else if (transactionStatus === "cancel" || transactionStatus === "expire") {
      bookingStatus = "cancelled";
    } else if (transactionStatus === "deny") {
      bookingStatus = "cancelled";
    } else if (transactionStatus === "pending") {
      bookingStatus = "pending";
    } else {
      // refund, partial_refund, etc. — don't change status
      logger.info("[midtrans webhook] Unhandled transaction status", {
        component: "midtrans",
        orderId,
        transactionStatus,
      });
      return NextResponse.json({ status: "ok" });
    }

    // Update booking record
    await db
      .update(bookings)
      .set({
        status: bookingStatus,
        paymentMethod: paymentType ?? null,
        midtransTransactionId: transactionId ?? null,
        transactionStatus,
        grossAmount: grossAmount,
        paymentChannel: null, // Will be populated if available in future
      })
      .where(eq(bookings.midtransOrderId, orderId));

    logger.info("[midtrans webhook] Booking updated", {
      component: "midtrans",
      orderId,
      bookingStatus,
      transactionStatus,
    });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    logger.error("[midtrans webhook] Unexpected error", {
      component: "midtrans",
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
