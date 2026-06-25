import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { type TRPCContext } from "./context";

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ error, shape }) => {
    const isProduction = process.env.NODE_ENV === "production";

    if (!isProduction) {
      return shape;
    }

    const isTRPCError = error instanceof TRPCError;
    const isZodError = error.cause instanceof ZodError;

    const sanitized = {
      ...shape,
      data: {
        ...shape.data,
        stack: undefined,
      },
    };

    if (isZodError) {
      const fieldErrors = (error.cause as ZodError).flatten().fieldErrors;
      return {
        ...sanitized,
        data: {
          ...sanitized.data,
          zodError: fieldErrors,
        },
      };
    }

    if (!isTRPCError) {
      return {
        ...sanitized,
        message: "Internal server error",
      };
    }

    return sanitized;
  },
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(
  async ({ ctx, next }) => {
    if (!ctx.session) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({ ctx: { ...ctx, session: ctx.session } });
  }
);

export const adminProcedure = t.procedure.use(
  async ({ ctx, next }) => {
    if (!ctx.session) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    if (ctx.session.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next({ ctx: { ...ctx, session: ctx.session } });
  }
);
