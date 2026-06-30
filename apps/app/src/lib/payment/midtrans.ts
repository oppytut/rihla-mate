import crypto from "node:crypto";
import midtransClient from "midtrans-client";
import { env } from "@/env";

const isProduction = env.MIDTRANS_SERVER_KEY?.startsWith("Mid-server-") ?? false;

const snap = new midtransClient.Snap({
  isProduction,
  serverKey: env.MIDTRANS_SERVER_KEY || "",
  clientKey: env.MIDTRANS_CLIENT_KEY || "",
});

const coreApi = new midtransClient.CoreApi({
  isProduction,
  serverKey: env.MIDTRANS_SERVER_KEY || "",
  clientKey: env.MIDTRANS_CLIENT_KEY || "",
});

export interface CreateSnapTransactionParams {
  orderId: string;
  grossAmount: number;
  items: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
    category?: string;
  }>;
  customer: {
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
  };
  callbacks?: {
    finish?: string;
    error?: string;
    pending?: string;
  };
}

export interface SnapTransactionResult {
  token: string;
  redirectUrl: string;
}

/**
 * Generate a Midtrans Snap token for client-side payment popup.
 */
export async function createSnapTransaction(
  params: CreateSnapTransactionParams,
): Promise<SnapTransactionResult> {
  const parameter = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.grossAmount,
    },
    credit_card: {
      secure: true,
    },
    customer_details: {
      first_name: params.customer.firstName,
      last_name: params.customer.lastName,
      email: params.customer.email,
      phone: params.customer.phone,
    },
    item_details: params.items.map((item) => ({
      id: item.id,
      price: item.price,
      quantity: item.quantity,
      name: item.name,
      ...(item.category ? { category: item.category } : {}),
    })),
    callbacks: {
      finish: params.callbacks?.finish,
      error: params.callbacks?.error,
      pending: params.callbacks?.pending,
    },
  };

  const transaction = await snap.createTransaction(parameter);

  return {
    token: transaction.token as string,
    redirectUrl: transaction.redirect_url as string,
  };
}

/**
 * Verify Midtrans webhook notification signature.
 * Formula: SHA512(order_id + status_code + gross_amount + ServerKey)
 */
export function verifyWebhookSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string,
): boolean {
  const serverKey = env.MIDTRANS_SERVER_KEY || "";

  const expected = crypto
    .createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(signatureKey), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Get transaction status from Midtrans Core API.
 */
export async function getTransactionStatus(orderId: string) {
  return coreApi.transaction.status(orderId);
}

/**
 * Check if Midtrans is configured (both server and client keys are set).
 */
export function isMidtransConfigured(): boolean {
  return Boolean(env.MIDTRANS_SERVER_KEY && env.MIDTRANS_CLIENT_KEY);
}
