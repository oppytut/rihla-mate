/**
 * Cloudflare Workers scheduler — no-op stub.
 *
 * Cloudflare Cron Triggers invoke the worker independently via wrangler.jsonc
 * cron triggers. No in-process scheduling is needed (or possible) on Workers.
 *
 * The `schedule` method returns a no-op stop handle so callers don't need
 * to branch on the deployment target.
 */

import type { Scheduler } from "./scheduler";

export const cfScheduler: Scheduler = {
  schedule(): { stop: () => void } {
    // On Workers, scheduling is configured declaratively via wrangler.jsonc cron triggers.
    // This is a no-op — the returned handle satisfies the interface.
    return { stop: () => {} };
  },
};
