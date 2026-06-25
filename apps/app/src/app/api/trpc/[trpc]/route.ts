import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { appRouter } from "@/lib/trpc/routers/_app";
import { createTRPCContext } from "@/lib/trpc/context";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError: ({ path, error }) => {
      console.error("[tRPC] Unhandled error:", path, error);
    },
  });

export { handler as GET, handler as POST };
