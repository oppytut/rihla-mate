/**
 * Scheduler factory — returns the correct implementation based on DEPLOYMENT_TARGET.
 */

import type { Scheduler } from "./scheduler";
import { vpsScheduler } from "./scheduler-vps";
import { cfScheduler } from "./scheduler-cf";
import { env } from "@/env";

export function getScheduler(): Scheduler {
  if (env.DEPLOYMENT_TARGET === "cloudflare") {
    return cfScheduler;
  }
  return vpsScheduler;
}
