import type { FullConfig } from "@playwright/test";
import { main as runSeed } from "./playwright-seed";

async function globalSetup(_config: FullConfig) {
  console.log("[global-setup] Running seed script...");
  try {
    await runSeed();
    console.log("[global-setup] Seed completed successfully.");
  } catch (err) {
    console.error("[global-setup] Seed failed:", err);
    throw err;
  }
}

export default globalSetup;
