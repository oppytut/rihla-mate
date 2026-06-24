import type { Context, Next } from "hono";
import { db, eq, schema } from "../lib/db";

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  let apiKey = c.req.header("X-API-Key");

  if (!apiKey && authHeader?.startsWith("Bearer ")) {
    apiKey = authHeader.slice(7);
  }

  if (!apiKey) {
    return c.json({ error: "Missing API key" }, 401);
  }

  try {
    const [key] = await db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.key, apiKey))
      .limit(1);

    if (!key) {
      return c.json({ error: "Invalid API key" }, 401);
    }

    await db
      .update(schema.apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(schema.apiKeys.id, key.id));

    c.set("apiKey", key);
    await next();
  } catch {
    return c.json({ error: "Authentication failed" }, 401);
  }
}
