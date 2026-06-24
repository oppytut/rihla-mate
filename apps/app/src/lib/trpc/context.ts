import { type FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { db } from "@/lib/db/client";
import { auth } from "@/lib/auth";

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

export async function createTRPCContext(
  opts: FetchCreateContextFnOptions
): Promise<TRPCContext> {
  const session = await auth.api.getSession({
    headers: opts.req.headers,
  });

  return {
    headers: opts.req.headers,
    db,
    session,
  };
}
