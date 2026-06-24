import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../middleware/auth";
import { db, eq, schema } from "../lib/db";
import type { RevokeResponse } from "@rihla-mate/shared";

const revokeSchema = z.object({
  licenseId: z.string().min(1),
  reason: z.string().optional(),
});

const app = new Hono();

app.use("*", authMiddleware);

app.post("/", zValidator("json", revokeSchema), async (c) => {
  const body = c.req.valid("json");

  const [license] = await db
    .select()
    .from(schema.licenses)
    .where(eq(schema.licenses.id, body.licenseId))
    .limit(1);

  if (!license) {
    return c.json({ error: "License not found" }, 404);
  }

  if (license.status === "revoked") {
    return c.json({ error: "License is already revoked" }, 409);
  }

  await db
    .update(schema.licenses)
    .set({
      status: "revoked",
      updatedAt: new Date(),
    })
    .where(eq(schema.licenses.id, body.licenseId));

  if (body.reason) {
    console.log(
      `[REVOKE] License ${body.licenseId} revoked. Reason: ${body.reason}`,
    );
  }

  const response: RevokeResponse = { success: true };
  return c.json(response);
});

export default app;
