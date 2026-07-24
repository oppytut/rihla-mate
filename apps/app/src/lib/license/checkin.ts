import { db as defaultDb } from "@/lib/db/client";
import {
  getLicenseByKey,
  createLicense,
  invalidateLicenseCache,
  licenseKeys,
} from "@/lib/license/store";
import type { LicenseKey } from "@/lib/license/store";
import type {
  ActivateResponse,
  CheckinResponse,
  LicensePayload,
  LicensePlan,
} from "@rihla-mate/shared";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { env } from "@/env";
import { logger } from "@/lib/utils/logger";
import { getScheduler } from "@/lib/background";

const activateResponseSchema = z.object({
  success: z.boolean(),
  license: z
    .object({
      licenseId: z.string(),
      customerId: z.string(),
      customerName: z.string(),
      plan: z.string(),
      features: z.array(z.string()),
      maxTenants: z.number(),
      maxMonthlyBookings: z.number(),
      expiresAt: z.string(),
      gracePeriodDays: z.number(),
      isTrial: z.boolean(),
      trialDays: z.number(),
      apiUrl: z.string(),
      status: z.string(),
      activatedAt: z.string(),
      domain: z.string(),
    })
    .optional(),
  error: z.string().optional(),
  code: z.string().optional(),
});

const checkinResponseSchema = z.object({
  status: z.enum(["ok", "warning", "revoked", "expired"]),
  plan: z.string().optional(),
  features: z.array(z.string()).optional(),
  expiresAt: z.string().optional(),
  graceRemaining: z.number().optional(),
  warnings: z.array(z.string()).optional(),
  error: z.string().optional(),
});

export interface LicenseCheckInResult {
  valid: boolean;
  reason?: string;
  expiresAt?: Date;
  seats?: number;
  plan?: string;
  licenseId?: string;
}

interface ValidateResponse {
  valid: boolean;
  reason?: string;
  expiresAt?: string;
  seats?: number;
  plan?: string;
  licenseId?: string;
  instanceId?: string;
}

function base64urlDecode(str: string): Uint8Array {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function decodeLicensePayload(licenseKey: string): LicensePayload | null {
  try {
    const parts = licenseKey.split(".");
    if (parts.length !== 3 || parts[0] !== "RML1") return null;
    const payloadJson = new TextDecoder().decode(base64urlDecode(parts[1]));
    return JSON.parse(payloadJson) as LicensePayload;
  } catch {
    return null;
  }
}

export function getLicenseServerUrl(): string {
  return env.LICENSE_SERVER_URL;
}

function getApiKey(): string | undefined {
  return env.LICENSE_API_KEY;
}

export function getInstanceId(): string {
  return env.INSTANCE_ID ?? "rihla-mate-default";
}

function authHeaders(): HeadersInit {
  const apiKey = getApiKey();
  if (!apiKey) return { "Content-Type": "application/json" };
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "X-API-Key": apiKey,
  };
}

function apiBase(serverUrl: string): string {
  return serverUrl.replace(/\/$/, "");
}

export async function activateWithServer(
  licenseKey: string,
  options?: { instanceId?: string; domain?: string; ipAddress?: string },
): Promise<ValidateResponse> {
  const serverUrl = getLicenseServerUrl();
  const instanceId = options?.instanceId ?? getInstanceId();
  const url = `${apiBase(serverUrl)}/api/v1/activate`;

  if (!getApiKey()) {
    logger.error("LICENSE_API_KEY not set — cannot activate", { component: "checkin" });
    return { valid: false, reason: "MISSING_API_KEY" };
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        licenseKey,
        instanceId,
        domain: options?.domain,
        ipAddress: options?.ipAddress,
      }),
    });
  } catch (err) {
    logger.error("Network error during license activation", { component: "checkin" }, err);
    return { valid: false, reason: "NETWORK_ERROR" };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { valid: false, reason: "INVALID_LICENSE" };
  }

  if (!response.ok) {
    const errBody = body as { code?: string; error?: string };
    return {
      valid: false,
      reason: errBody.code ?? errBody.error ?? "INVALID_LICENSE",
    };
  }

  const parsed = activateResponseSchema.safeParse(body);
  if (!parsed.success || !parsed.data.success || !parsed.data.license) {
    return { valid: false, reason: "INVALID_LICENSE" };
  }

  const license = parsed.data.license as ActivateResponse["license"];
  return {
    valid: true,
    plan: license.plan,
    expiresAt: license.expiresAt,
    seats: 1,
    licenseId: license.licenseId,
    instanceId,
  };
}

export async function checkinWithServer(
  licenseId: string,
  options?: { instanceId?: string; ipAddress?: string; appVersion?: string },
): Promise<ValidateResponse> {
  const serverUrl = getLicenseServerUrl();
  const instanceId = options?.instanceId ?? getInstanceId();
  const url = `${apiBase(serverUrl)}/api/v1/checkin`;

  if (!getApiKey()) {
    logger.error("LICENSE_API_KEY not set — cannot check in", { component: "checkin" });
    return { valid: false, reason: "MISSING_API_KEY" };
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        licenseId,
        instanceId,
        ipAddress: options?.ipAddress,
        appVersion: options?.appVersion,
      }),
    });
  } catch (err) {
    logger.error("Network error during license check-in", { component: "checkin" }, err);
    return { valid: false, reason: "NETWORK_ERROR" };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { valid: false, reason: "INVALID_LICENSE" };
  }

  if (!response.ok) {
    const errBody = body as { error?: string };
    return { valid: false, reason: errBody.error ?? "INVALID_LICENSE" };
  }

  const parsed = checkinResponseSchema.safeParse(body);
  if (!parsed.success) {
    return { valid: false, reason: "INVALID_LICENSE" };
  }

  const data = parsed.data as CheckinResponse & { error?: string };
  if (data.status === "revoked" || data.status === "expired") {
    return { valid: false, reason: data.status.toUpperCase(), plan: data.plan };
  }

  return {
    valid: true,
    plan: data.plan,
    expiresAt: data.expiresAt,
    seats: 1,
    licenseId,
    instanceId,
  };
}

export async function verifyLicenseWithServer(licenseKey: string): Promise<ValidateResponse> {
  const payload = decodeLicensePayload(licenseKey);
  if (!payload?.licenseId) {
    return activateWithServer(licenseKey);
  }

  const checkinResult = await checkinWithServer(payload.licenseId);
  if (checkinResult.valid) {
    return {
      ...checkinResult,
      plan: checkinResult.plan ?? payload.plan,
      expiresAt: checkinResult.expiresAt ?? payload.expiresAt,
    };
  }

  if (checkinResult.reason === "MISSING_API_KEY") return checkinResult;
  if (
    checkinResult.reason === "Instance not activated for this license" ||
    checkinResult.reason === "INVALID_LICENSE"
  ) {
    return activateWithServer(licenseKey);
  }

  return checkinResult;
}

export async function updateLocalLicense(
  db: typeof defaultDb,
  licenseKey: string,
  serverResponse: ValidateResponse,
): Promise<LicenseKey | undefined> {
  if (!serverResponse.valid) {
    return undefined;
  }

  const existing = await getLicenseByKey(db, licenseKey);

  if (existing) {
    await db.delete(licenseKeys).where(eq(licenseKeys.key, licenseKey));
  }

  const payload = decodeLicensePayload(licenseKey);
  const created = await createLicense(db, {
    key: licenseKey,
    type: (serverResponse.plan as LicensePlan | undefined) ?? payload?.plan ?? "pro",
    seats: serverResponse.seats ?? 1,
    expiresAt: serverResponse.expiresAt
      ? new Date(serverResponse.expiresAt)
      : payload?.expiresAt
        ? new Date(payload.expiresAt)
        : undefined,
    metadata: {
      lastCheckinAt: new Date().toISOString(),
      licenseId: serverResponse.licenseId ?? payload?.licenseId,
      instanceId: serverResponse.instanceId ?? getInstanceId(),
    },
  });

  invalidateLicenseCache(licenseKey);

  return created;
}

export async function checkIn(
  db: typeof defaultDb,
  licenseKey: string,
): Promise<LicenseCheckInResult> {
  const serverResponse = await verifyLicenseWithServer(licenseKey);

  if (!serverResponse.valid) {
    return {
      valid: false,
      reason: serverResponse.reason ?? "INVALID_LICENSE",
    };
  }

  await updateLocalLicense(db, licenseKey, serverResponse);

  return {
    valid: true,
    expiresAt: serverResponse.expiresAt ? new Date(serverResponse.expiresAt) : undefined,
    seats: serverResponse.seats,
    plan: serverResponse.plan,
    licenseId: serverResponse.licenseId,
  };
}

export function scheduleCheckIn(
  db: typeof defaultDb,
  licenseKey: string,
  intervalMs: number = 86_400_000,
): { stop: () => void } {
  const scheduler = getScheduler();
  return scheduler.schedule(async () => {
    try {
      await checkIn(db, licenseKey);
    } catch (err) {
      logger.error("Scheduled check-in failed", { component: "checkin" }, err);
    }
  }, intervalMs);
}
