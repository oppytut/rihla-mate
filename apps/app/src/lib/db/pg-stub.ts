// Stub module for pg — replaced via wrangler alias on Cloudflare Workers
// The real pg module is only used on VPS (via client.node.ts), never on Workers.
// This stub prevents wrangler's esbuild from failing to resolve pg during deploy.
export default {};
export const Pool = {};
export const types = {};
