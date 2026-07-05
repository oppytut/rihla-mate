import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { appRouter } from "@/lib/trpc/routers/_app";
import { createTRPCContext } from "@/lib/trpc/context";
import { logger } from "@/lib/utils/logger";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    allowMethodOverride: true,
    onError: ({ path, error }) => {
      logger.error("[tRPC] Unhandled error:", { component: "trpc-route", path }, error);
    },
  });

export { handler as GET, handler as POST };
