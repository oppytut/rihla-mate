/**
 * Better Auth API route handler — supports VPS (static auth) and
 * Cloudflare Workers (async initAuth via OpenNext).
 *
 * On Workers, initAuth() uses getCloudflareContext() + withCloudflare()
 * to wire KV, geolocation, and IP detection.
 */
import { getAuth, initAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { env } from "@/env";

let _vpsHandler: ReturnType<typeof toNextJsHandler> | undefined;

function getVpsHandler() {
  if (!_vpsHandler) {
    _vpsHandler = toNextJsHandler(getAuth());
  }
  return _vpsHandler;
}

export async function GET(request: Request) {
  if (env.DEPLOYMENT_TARGET === "cloudflare") {
    const authInstance = await initAuth();
    return authInstance.handler(request);
  }
  return getVpsHandler().GET(request);
}

export async function POST(request: Request) {
  if (env.DEPLOYMENT_TARGET === "cloudflare") {
    const authInstance = await initAuth();
    return authInstance.handler(request);
  }
  return getVpsHandler().POST(request);
}
