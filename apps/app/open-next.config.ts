// open-next.config.ts — Cloudflare adapter configuration for @opennextjs/cloudflare
// See https://opennext.js.org/cloudflare/get-started

import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import kvTagCache from "@opennextjs/cloudflare/overrides/tag-cache/kv-next-tag-cache";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: kvTagCache,
  queue: "direct",
  enableCacheInterception: false,
  routePreloadingBehavior: "none",
});
