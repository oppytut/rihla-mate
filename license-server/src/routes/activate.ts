import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../middleware/auth";
import { rateLimitMiddleware } from "../middleware/rate-limit";
import { verifyKey } from "../lib/signing";
import { db, eq, schema } from "../lib/db";
import type { ActivateResponse, ActivateError } from "@rihla-mate/shared";

const activateSchema = z.object({
  licenseKey: z.string().min(1),
  instanceId: z.string().min(1),
  domain: z.string().optional(),
  ipAddress: z.string().optional(),
});

const app = new Hono();

app.use("*", authMiddleware);
app.use("*", rateLimitMiddleware());

app.post("/", zValidator("json", activateSchema), async (c) => {
  const body = c.req.valid("json");

  const publicKeyHex = process.env.LICENSE_PUBLIC_KEY;
  if (!publicKeyHex) {
    return c.json({ error: "Server configuration error" }, 500);
  }

  const publicKey = Buffer.from(publicKeyHex, "hex");
  const { valid, payload } = await verifyKey(body.licenseKey, publicKey);

  if (!valid || !payload) {
    const error: ActivateError = { success: false, error: "Invalid license key", code: "INVALID_KEY" };
    return c.json(error, 400);
  }

  const [license] = await db
    .select()
    .from(schema.licenses)
    .where(eq(schema.licenses.id, payload.licenseId))
    .limit(1);

  if (!license) {
    const error: ActivateError = { success: false, error: "License not found", code: "LICENSE_NOT_FOUND" };
    return c.json(error, 404);
  }

  if (license.status === "revoked") {
    const error: ActivateError = { success: false, error: "License has been revoked", code: "REVOKED" };
    return c.json(error, 410);
  }

  if (license.status === "expired") {
    const error: ActivateError = { success: false, error: "License has expired", code: "EXPIRED" };
    return c.json(error, 410);
  }

  const now = new Date();
  const expiresAt = new Date(license.expiresAt);
  if (now > expiresAt) {
    const error: ActivateError = { success: false, error: "License has expired", code: "EXPIRED" };
    return c.json(error, 410);
  }

  const [existingActivation] = await db
    .select()
    .from(schema.activations)
    .where(eq(schema.activations.licenseId, payload.licenseId))
    .limit(1);

  if (existingActivation) {
    if (
      body.domain &&
      existingActivation.domain &&
      existingActivation.domain !== body.domain
    ) {
      const domainChangeId = `dc_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
      await db.insert(schema.domainChanges).values({
        id: domainChangeId,
        licenseId: payload.licenseId,
        oldDomain: existingActivation.domain,
        newDomain: body.domain,
        changedAt: now,
        ipAddress: body.ipAddress ?? null,
      });

      await db
        .update(schema.activations)
        .set({
          domain: body.domain,
          ipAddress: body.ipAddress ?? null,
        })
        .where(eq(schema.activations.id, existingActivation.id));

      const response: ActivateResponse = {
        success: true,
        license: {
          licenseId: payload.licenseId,
          customerId: payload.customerId,
          customerName: payload.customerName,
          plan: payload.plan,
          features: payload.features,
          maxTenants: payload.maxTenants,
          maxMonthlyBookings: payload.maxMonthlyBookings,
          expiresAt: payload.expiresAt,
          gracePeriodDays: payload.gracePeriodDays,
          isTrial: payload.isTrial,
          trialDays: payload.trialDays,
          apiUrl: payload.apiUrl,
          status: license.status as ActivateResponse["license"]["status"],
          activatedAt: existingActivation.activatedAt.toISOString(),
          domain: body.domain ?? existingActivation.domain ?? "",
        },
      };
      return c.json({ ...response, domainChanged: true, oldDomain: existingActivation.domain });
    }

    if (
      body.domain &&
      existingActivation.domain &&
      existingActivation.domain !== body.domain
    ) {
      const error: ActivateError & { currentDomain?: string } = {
        success: false,
        error: "License already activated on a different domain",
        code: "ALREADY_ACTIVATED",
        existingDomain: existingActivation.domain ?? undefined,
      };
      return c.json(error, 409);
    }

    const response: ActivateResponse = {
      success: true,
      license: {
        licenseId: payload.licenseId,
        customerId: payload.customerId,
        customerName: payload.customerName,
        plan: payload.plan,
        features: payload.features,
        maxTenants: payload.maxTenants,
        maxMonthlyBookings: payload.maxMonthlyBookings,
        expiresAt: payload.expiresAt,
        gracePeriodDays: payload.gracePeriodDays,
        isTrial: payload.isTrial,
        trialDays: payload.trialDays,
        apiUrl: payload.apiUrl,
        status: license.status as ActivateResponse["license"]["status"],
        activatedAt: existingActivation.activatedAt.toISOString(),
        domain: existingActivation.domain ?? "",
      },
    };
    return c.json(response);
  }

  const activationId = `act_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  await db.insert(schema.activations).values({
    id: activationId,
    licenseId: payload.licenseId,
    instanceId: body.instanceId,
    domain: body.domain ?? null,
    ipAddress: body.ipAddress ?? null,
    activatedAt: now,
  });

  const response: ActivateResponse = {
    success: true,
    license: {
      licenseId: payload.licenseId,
      customerId: payload.customerId,
      customerName: payload.customerName,
      plan: payload.plan,
      features: payload.features,
      maxTenants: payload.maxTenants,
      maxMonthlyBookings: payload.maxMonthlyBookings,
      expiresAt: payload.expiresAt,
      gracePeriodDays: payload.gracePeriodDays,
      isTrial: payload.isTrial,
      trialDays: payload.trialDays,
      apiUrl: payload.apiUrl,
      status: license.status as ActivateResponse["license"]["status"],
      activatedAt: now.toISOString(),
      domain: body.domain ?? "",
    },
  };
  return c.json(response);
});

export default app;
