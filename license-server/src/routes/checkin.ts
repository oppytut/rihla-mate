import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../middleware/auth";
import { rateLimitMiddleware } from "../middleware/rate-limit";
import { db, eq, and, schema } from "../lib/db";
import type { CheckinResponse } from "@rihla-mate/shared";

const checkinSchema = z.object({
  licenseId: z.string().min(1),
  instanceId: z.string().min(1),
  ipAddress: z.string().optional(),
  appVersion: z.string().optional(),
  moduleHash: z.string().optional(),
});

const EXPECTED_MODULE_HASH = process.env.EXPECTED_MODULE_HASH;

const app = new Hono();

app.use("*", authMiddleware);
app.use("*", rateLimitMiddleware({ maxRequests: 60, windowSeconds: 60 }));

app.post("/", zValidator("json", checkinSchema), async (c) => {
  const body = c.req.valid("json");

  const [license] = await db
    .select()
    .from(schema.licenses)
    .where(eq(schema.licenses.id, body.licenseId))
    .limit(1);

  if (!license) {
    return c.json({ error: "License not found" }, 404);
  }

  const [activation] = await db
    .select()
    .from(schema.activations)
    .where(
      and(
        eq(schema.activations.licenseId, body.licenseId),
        eq(schema.activations.instanceId, body.instanceId),
      ),
    )
    .limit(1);

  if (!activation) {
    return c.json({ error: "Instance not activated for this license" }, 403);
  }

  let tamperedWarning: string | undefined;
  if (body.moduleHash && EXPECTED_MODULE_HASH) {
    if (body.moduleHash !== EXPECTED_MODULE_HASH) {
      tamperedWarning = "Module hash mismatch detected. Application may have been modified.";
      // Logging intentionally uses console — no structured logger in license-server
      console.warn(
        `[TAMPER] License ${body.licenseId}, instance ${body.instanceId}: module hash mismatch`,
      );
    }
  }

  if (license.status === "revoked") {
    return c.json({ status: "revoked" });
  }

  const now = new Date();
  const expiresAt = new Date(license.expiresAt);
  const graceEnd = new Date(expiresAt.getTime() + license.gracePeriodDays * 24 * 60 * 60 * 1000);

  if (now > graceEnd) {
    await db
      .update(schema.licenses)
      .set({ status: "expired", updatedAt: now })
      .where(eq(schema.licenses.id, body.licenseId));

    return c.json({ status: "expired" });
  }

  const graceRemaining = Math.max(
    0,
    Math.ceil((graceEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
  );

  const checkinId = `chk_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  await db.insert(schema.checkins).values({
    id: checkinId,
    licenseId: body.licenseId,
    instanceId: body.instanceId,
    timestamp: now,
    ipAddress: body.ipAddress ?? null,
  });

  await db
    .update(schema.licenses)
    .set({ updatedAt: now })
    .where(eq(schema.licenses.id, body.licenseId));

  const response: CheckinResponse = {
    status: "ok",
    plan: license.plan as CheckinResponse["plan"],
    features: license.features as CheckinResponse["features"],
    expiresAt: license.expiresAt.toISOString(),
    graceRemaining,
    warnings: tamperedWarning ? [tamperedWarning] : undefined,
  };

  return c.json(response);
});

export default app;
