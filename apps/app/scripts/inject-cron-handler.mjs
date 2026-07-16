/* global console, process */
/**
 * Post-build script: injects a `scheduled` handler into the generated
 * .open-next/worker.js for Cloudflare Workers Cron Triggers.
 *
 * Run after `opennextjs-cloudflare build`:
 *   node scripts/inject-cron-handler.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, "..");
const openNextDir = path.join(appDir, ".open-next");
const workerPath = path.join(openNextDir, "worker.js");
const cronSourcePath = path.join(appDir, "src", "cron.ts");
const cronOutputPath = path.join(openNextDir, "cron-handler.mjs");

// Step 1: Bundle the cron handler with esbuild
console.log("[inject-cron] Bundling cron handler...");
execSync(
  [
    "npx esbuild",
    cronSourcePath,
    "--bundle",
    "--format=esm",
    "--platform=browser",
    "--external:@neondatabase/serverless",
    "--external:drizzle-orm/*",
    `--outfile=${cronOutputPath}`,
  ].join(" "),
  { cwd: appDir, stdio: "inherit" },
);

// Step 2: Verify worker.js exists
if (!fs.existsSync(workerPath)) {
  console.error(
    `[inject-cron] ERROR: ${workerPath} not found. Run opennextjs-cloudflare build first.`,
  );
  process.exit(1);
}

// Step 3: Read worker.js and append scheduled export
let workerContent = fs.readFileSync(workerPath, "utf-8");

if (workerContent.includes("export { scheduled }")) {
  console.log("[inject-cron] scheduled handler already injected, skipping.");
  process.exit(0);
}

workerContent += `
// Injected by scripts/inject-cron-handler.mjs — Cloudflare Workers Cron Trigger
export { scheduled } from "./cron-handler.mjs";
`;

fs.writeFileSync(workerPath, workerContent);
console.log("[inject-cron] scheduled handler injected into .open-next/worker.js");
