import { createTRPCRouter, publicProcedure } from "../init";

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({ status: "ok" })),
});

export type AppRouter = typeof appRouter;
