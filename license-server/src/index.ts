import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import activateRoute from "./routes/activate";
import checkinRoute from "./routes/checkin";
import revokeRoute from "./routes/revoke";
import healthRoute from "./routes/health";

const app = new Hono().basePath("/api/v1");

app.use("*", cors());
app.use("*", logger());

app.route("/activate", activateRoute);
app.route("/checkin", checkinRoute);
app.route("/revoke", revokeRoute);
app.route("/health", healthRoute);

app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
