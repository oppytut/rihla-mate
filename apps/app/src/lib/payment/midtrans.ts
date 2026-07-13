import { env } from "@/env";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SNAP_BASE_URL = "https://app.midtrans.com/snap/v1";
const CORE_API_BASE_URL = "https://api.midtrans.com/v2";
const SNAP_SANDBOX_URL = "https://app.sandbox.midtrans.com/snap/v1";
const CORE_API_SANDBOX_URL = "https://api.sandbox.midtrans.com/v2";

function getSnapUrl(): string {
  const isProduction = env.MIDTRANS_SERVER_KEY?.startsWith("Mid-server-") ?? false;
  return isProduction ? SNAP_BASE_URL : SNAP_SANDBOX_URL;
}

function getCoreApiUrl(): string {
  const isProduction = env.MIDTRANS_SERVER_KEY?.startsWith("Mid-server-") ?? false;
  return isProduction ? CORE_API_BASE_URL : CORE_API_SANDBOX_URL;
}

function getAuthHeader(): string {
  const serverKey = env.MIDTRANS_SERVER_KEY || "";
  return `Basic ${btoa(`${serverKey}:`)}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
    redirect?: string;
    error?: string;
    pending?: string;
  };
}

export interface SnapTransactionResult {
  token: string;
  redirectUrl: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Encode a string to hex using Web Crypto API.
 * Equivalent to: Buffer.from(str).toString("hex")
 */
async function sha512Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Constant-time string comparison using bitwise XOR.
 * Replaces crypto.timingSafeEqual which is not available in Web Crypto API.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to avoid leaking length info
    let result = a.length ^ b.length;
    const minLen = Math.min(a.length, b.length);
    for (let i = 0; i < minLen; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a Midtrans Snap token for client-side payment popup.
 */
export async function createSnapTransaction(
  params: CreateSnapTransactionParams,
): Promise<SnapTransactionResult> {
  const body = {
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
      redirect: params.callbacks?.redirect,
      error: params.callbacks?.error,
      pending: params.callbacks?.pending,
    },
  };

  const response = await fetch(`${getSnapUrl()}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Midtrans Snap API error (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as { token: string; redirect_url: string };
  return {
    token: data.token,
    redirectUrl: data.redirect_url,
  };
}

/**
 * Verify Midtrans webhook notification signature.
 * Formula: SHA512(order_id + status_code + gross_amount + ServerKey)
 */
export async function verifyWebhookSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string,
): Promise<boolean> {
  const serverKey = env.MIDTRANS_SERVER_KEY || "";
  const expected = await sha512Hex(`${orderId}${statusCode}${grossAmount}${serverKey}`);
  return constantTimeEqual(signatureKey, expected);
}

/**
 * Get transaction status from Midtrans Core API.
 */
export async function getTransactionStatus(orderId: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${getCoreApiUrl()}/${encodeURIComponent(orderId)}/status`, {
    headers: {
      Authorization: getAuthHeader(),
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Midtrans Core API error (${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

/**
 * Check if Midtrans is configured (both server and client keys are set).
 */
export function isMidtransConfigured(): boolean {
  return Boolean(env.MIDTRANS_SERVER_KEY && env.MIDTRANS_CLIENT_KEY);
}
