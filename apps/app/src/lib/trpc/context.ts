import { type FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { db } from "@/lib/db/client";

export type Session = {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
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
  return {
    headers: opts.req.headers,
    db,
    session: null,
  };
}
