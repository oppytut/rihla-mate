import { type FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { db } from "@/lib/db/client";
import { getOrInitAuth, initAuth } from "@/lib/auth";
import { env } from "@/env";
import { logger } from "@/lib/utils/logger";

export type Session = {
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | null;
    role: string | undefined | null;
    createdAt: Date;
    updatedAt: Date;
  };
};

export type TRPCContext = {
  headers: Headers;
  db: typeof db;
  session: Session | null;
};

async function getAuth() {
  if (env.DEPLOYMENT_TARGET === "cloudflare") {
    return initAuth();
  }
  return getOrInitAuth();
}

export async function createTRPCContext(opts: FetchCreateContextFnOptions): Promise<TRPCContext> {
  let session: Session | null = null;
  try {
    const auth = await getAuth();
    session = (await auth.api.getSession({
      headers: opts.req.headers,
    })) as Session | null;
  } catch (err) {
    logger.error("[tRPC] Failed to resolve session:", { component: "context" }, err);
  }

  return {
    headers: opts.req.headers,
    db,
    session,
  };
}
