/**
 * VPS scheduler — recursive setTimeout.
 *
 * Runs a function repeatedly at the given interval.
 * On failure, the delay doubles (exponential backoff) up to the original interval.
 */

import type { Scheduler } from "./scheduler";

export const vpsScheduler: Scheduler = {
  schedule(fn: () => Promise<void>, intervalMs: number): { stop: () => void } {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const run = (delayMs: number) => {
      if (stopped) return;

      timer = setTimeout(async () => {
        if (stopped) return;
        try {
          await fn();
          run(intervalMs);
        } catch {
          const nextDelay = Math.min(delayMs * 2, intervalMs);
          run(nextDelay);
        }
      }, delayMs);
    };

    run(intervalMs);

    return {
      stop: () => {
        stopped = true;
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
      },
    };
  },
};
