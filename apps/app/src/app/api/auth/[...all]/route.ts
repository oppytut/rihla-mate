/**
 * Better Auth API route handler — supports VPS (static auth) and
 * Cloudflare Workers (async initAuth via OpenNext).
 *
 * On Workers, initAuth() uses getCloudflareContext() + withCloudflare()
 * to wire KV, geolocation, and IP detection.
 */
import { getOrInitAuth, initAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { env } from "@/env";

let _vpsHandler: ReturnType<typeof toNextJsHandler> | undefined;

async function getVpsHandler() {
  if (!_vpsHandler) {
    _vpsHandler = toNextJsHandler(await getOrInitAuth());
  }
  return _vpsHandler;
}

export async function GET(request: Request) {
  if (env.DEPLOYMENT_TARGET === "cloudflare") {
    const authInstance = await initAuth();
    return authInstance.handler(request);
  }
  const handler = await getVpsHandler();
  return handler.GET(request);
}

export async function POST(request: Request) {
  if (env.DEPLOYMENT_TARGET === "cloudflare") {
    const authInstance = await initAuth();
    return authInstance.handler(request);
  }
  const handler = await getVpsHandler();
  return handler.POST(request);
}
