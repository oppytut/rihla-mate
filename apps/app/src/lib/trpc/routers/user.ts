import { createTRPCRouter, protectedProcedure } from "../init";

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    return { user: ctx.session.user };
  }),
});
