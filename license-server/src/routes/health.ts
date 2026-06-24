import { Hono } from "hono";
import type { HealthResponse } from "@rihla-mate/shared";

const app = new Hono();

app.get("/", (c) => {
  const body: HealthResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
  return c.json(body);
});

export default app;
