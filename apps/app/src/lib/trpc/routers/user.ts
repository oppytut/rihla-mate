import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, ilike, and, or, count, desc, sql, type SQLWrapper } from "drizzle-orm";
import { hashPassword } from "@better-auth/utils/password";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../init";
import { users } from "@/lib/db/schema/users";
import { accounts } from "@/lib/db/schema/accounts";
import { getOrInitAuth } from "@/lib/auth";

const roleSchema = z.enum(["owner", "admin", "staff"]);
const ELEVATED_ROLES = new Set(["owner", "admin"]);

function isElevatedRole(role: string | null | undefined): boolean {
  return role != null && ELEVATED_ROLES.has(role);
}

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    return { user: ctx.session.user };
  }),

  list: adminProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          role: z.string().optional(),
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(1).max(100).default(20),
        })
        .optional()
        .default({}),
    )
    .query(async ({ ctx, input }) => {
      const { search, role, page, limit } = input;
      const offset = (page - 1) * limit;

      const conditions: SQLWrapper[] = [];

      if (search) {
        conditions.push(
          or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`)) as SQLWrapper,
        );
      }

      if (role) {
        conditions.push(eq(users.role, role));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [itemsResult, countResult] = await Promise.allSettled([
        ctx.db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            emailVerified: users.emailVerified,
            image: users.image,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .where(where)
          .orderBy(desc(users.createdAt), desc(users.id))
          .limit(limit)
          .offset(offset),
        ctx.db.select({ count: count() }).from(users).where(where),
      ]);

      if (itemsResult.status === "rejected") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch users",
          cause: itemsResult.reason,
        });
      }

      const items = itemsResult.value;
      const total = countResult.status === "fulfilled" ? (countResult.value[0]?.count ?? 0) : 0;

      return { items, total, page, limit };
    }),

  create: adminProcedure
    .input(
      z.object({
        email: z.string().email().max(255),
        name: z.string().min(1).max(255),
        password: z.string().min(8).max(128),
        role: roleSchema.default("staff"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A user with this email already exists",
        });
      }

      const auth = await getOrInitAuth();
      let createdId: string;
      try {
        const result = await auth.api.signUpEmail({
          body: {
            email: input.email,
            password: input.password,
            name: input.name,
          },
        });
        createdId = result.user.id;
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Failed to create user",
          cause: err,
        });
      }

      const [updated] = await ctx.db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, createdId))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          createdAt: users.createdAt,
        });

      return updated;
    }),

  invite: adminProcedure
    .input(
      z.object({
        email: z.string().email().max(255),
        name: z.string().min(1).max(255),
        role: roleSchema.default("staff"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A user with this email already exists",
        });
      }

      const tempPassword = `Inv!${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
      const auth = await getOrInitAuth();
      let createdId: string;
      try {
        const result = await auth.api.signUpEmail({
          body: {
            email: input.email,
            password: tempPassword,
            name: input.name,
          },
        });
        createdId = result.user.id;
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Failed to invite user",
          cause: err,
        });
      }

      const [updated] = await ctx.db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, createdId))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          createdAt: users.createdAt,
        });

      const appBase = (
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.BETTER_AUTH_URL ||
        "http://localhost:3000"
      ).replace(/\/$/, "");
      const redirectTo = `${appBase}/reset-password`;

      try {
        const { withPasswordEmailKind } = await import("@/lib/email/password-email-kind");
        await withPasswordEmailKind("invite", async () => {
          await auth.api.requestPasswordReset({
            body: {
              email: input.email,
              redirectTo,
            },
          });
        });
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            err instanceof Error ? err.message : "User created but failed to send invite email",
          cause: err,
        });
      }

      return updated;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        role: roleSchema.optional(),
        password: z.string().min(8).max(128).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ id: users.id, role: users.role, email: users.email })
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const demotingElevated =
        input.role !== undefined && isElevatedRole(existing[0].role) && !isElevatedRole(input.role);

      if (demotingElevated && input.id === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot demote your own elevated account",
        });
      }

      if (demotingElevated) {
        const [{ elevatedCount }] = await ctx.db
          .select({ elevatedCount: sql<number>`cast(count(*) as int)` })
          .from(users)
          .where(or(eq(users.role, "admin"), eq(users.role, "owner")));

        if (elevatedCount <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot demote the last elevated user",
          });
        }
      }

      const patch: { name?: string; role?: string } = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.role !== undefined) patch.role = input.role;

      if (Object.keys(patch).length === 0 && !input.password) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No fields to update" });
      }

      if (input.password) {
        const passwordHash = await hashPassword(input.password);
        const creds = await ctx.db
          .select({ id: accounts.id })
          .from(accounts)
          .where(and(eq(accounts.userId, input.id), eq(accounts.providerId, "credential")))
          .limit(1);

        if (creds.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "User has no password credential account",
          });
        }

        await ctx.db
          .update(accounts)
          .set({ password: passwordHash })
          .where(eq(accounts.id, creds[0].id));
      }

      if (Object.keys(patch).length > 0) {
        const [updated] = await ctx.db
          .update(users)
          .set(patch)
          .where(eq(users.id, input.id))
          .returning({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          });
        return updated;
      }

      const [current] = await ctx.db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      return current;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (input.id === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot delete your own account",
        });
      }

      const existing = await ctx.db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      if (existing.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      if (isElevatedRole(existing[0].role)) {
        const [{ elevatedCount }] = await ctx.db
          .select({ elevatedCount: sql<number>`cast(count(*) as int)` })
          .from(users)
          .where(or(eq(users.role, "admin"), eq(users.role, "owner")));

        if (elevatedCount <= 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot delete the last elevated user",
          });
        }
      }

      await ctx.db.delete(users).where(eq(users.id, input.id));

      return { success: true };
    }),
});
