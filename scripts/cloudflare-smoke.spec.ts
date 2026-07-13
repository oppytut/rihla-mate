import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

const APP_DIR = path.join(process.cwd(), "apps/app");
const WORKER_PATH = path.join(APP_DIR, ".open-next/worker.js");

const FORBIDDEN_NODE_APIS = [
  'require("fs")',
  "require('fs')",
  'require("net")',
  "require('net')",
  'require("child_process")',
  "require('child_process')",
  'require("tls")',
  "require('tls')",
  'require("dgram")',
  "require('dgram')",
];

const MAX_WORKER_SIZE = 5 * 1024 * 1024;

test.describe("Cloudflare Workers build smoke", () => {
  test.skip(process.env.CI !== "true", "Only runs in CI (build:cf is slow)");
  test.skip(process.env.SKIP_CF_SMOKE === "true", "Skipped via SKIP_CF_SMOKE env var");

  test("build:cf succeeds and produces valid worker.js", { timeout: 180_000 }, () => {
    const output = execSync("pnpm build:cf", {
      cwd: APP_DIR,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    expect(output).toBeDefined();
    expect(fs.existsSync(WORKER_PATH)).toBe(true);

    const workerContent = fs.readFileSync(WORKER_PATH, "utf-8");
    expect(workerContent.length).toBeGreaterThan(0);

    const stats = fs.statSync(WORKER_PATH);
    expect(stats.size).toBeLessThanOrEqual(MAX_WORKER_SIZE);

    for (const forbidden of FORBIDDEN_NODE_APIS) {
      expect(workerContent).not.toContain(forbidden);
    }

    const hasDbClient = workerContent.includes("getDb") || workerContent.includes("neondatabase");
    expect(hasDbClient).toBe(true);
  });
});
