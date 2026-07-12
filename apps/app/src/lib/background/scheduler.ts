/**
 * Abstract scheduler interface.
 *
 * VPS: backed by recursive setTimeout (runs in-process).
 * Cloudflare: no-op stub — scheduling is handled by Cron Triggers defined in wrangler.jsonc.
 */

export interface Scheduler {
  schedule(fn: () => Promise<void>, intervalMs: number): { stop: () => void };
}
