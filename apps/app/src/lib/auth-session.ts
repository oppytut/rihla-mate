import "server-only";

import { headers } from "next/headers";
import { env } from "@/env";
import { getOrInitAuth, initAuth } from "@/lib/auth";
import type { Session } from "@/lib/trpc/context";
import { logger } from "@/lib/utils/logger";

async function getAuth() {
  if (env.DEPLOYMENT_TARGET === "cloudflare") {
    return initAuth();
  }
  return getOrInitAuth();
}

export async function getServerSession(): Promise<Session | null> {
  try {
    const auth = await getAuth();
    return (await auth.api.getSession({
      headers: await headers(),
    })) as Session | null;
  } catch (err) {
    logger.error("[auth] Failed to resolve server session:", { component: "auth-session" }, err);
    return null;
  }
}
