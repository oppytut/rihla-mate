import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { type TRPCContext } from "./context";
import { createRateLimitMiddleware } from "./rate-limit";

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

export const strictRateLimit = createRateLimitMiddleware(60_000, 5);
export const mediumRateLimit = createRateLimitMiddleware(60_000, 10);
export const standardRateLimit = createRateLimitMiddleware(60_000, 30);
export const relaxedRateLimit = createRateLimitMiddleware(60_000, 60);

type AppMiddleware = Parameters<typeof t.procedure.use>[0];

const inputGuard: AppMiddleware = async ({ ctx, next, input }) => {
  return next({ ctx, input: input === undefined ? {} : input });
};

export const publicProcedure = t.procedure.use(inputGuard).use(relaxedRateLimit as AppMiddleware);

export const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (ctx.session.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});
