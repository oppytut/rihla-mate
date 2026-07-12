/**
 * Better Auth API route handler — supports VPS (static auth) and
 * Cloudflare Workers (async initAuth via OpenNext).
 *
 * On Workers, initAuth() uses getCloudflareContext() + withCloudflare()
 * to wire KV, geolocation, and IP detection.
 */
import { auth, initAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { env } from "@/env";

const vpsHandler = toNextJsHandler(auth);

export async function GET(request: Request) {
  if (env.DEPLOYMENT_TARGET === "cloudflare") {
    const authInstance = await initAuth();
    return authInstance.handler(request);
  }
  return vpsHandler.GET(request);
}

export async function POST(request: Request) {
  if (env.DEPLOYMENT_TARGET === "cloudflare") {
    const authInstance = await initAuth();
    return authInstance.handler(request);
  }
  return vpsHandler.POST(request);
}
