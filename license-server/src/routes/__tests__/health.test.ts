import { describe, it, expect } from "vitest";
import app from "../../index.js";

describe("GET /health", () => {
  it("returns 200", async () => {
    const res = await app.request("/api/v1/health", { method: "GET" });
    expect(res.status).toBe(200);
  });

  it("returns status ok", async () => {
    const res = await app.request("/api/v1/health", { method: "GET" });
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  it("includes timestamp", async () => {
    const res = await app.request("/api/v1/health", { method: "GET" });
    const body = await res.json();
    expect(body).toHaveProperty("timestamp");
  });
});
