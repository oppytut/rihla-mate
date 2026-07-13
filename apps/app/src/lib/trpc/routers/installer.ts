import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, ne, sql } from "drizzle-orm";
import { createTRPCRouter, publicProcedure } from "../init";
import { users } from "@/lib/db/schema/users";
import { getAuth } from "@/lib/auth";

export const installerRouter = createTRPCRouter({
  resetForTesting: publicProcedure.mutation(async ({ ctx }) => {
    // Preserve the playwright seed user so shared storageState stays valid
    await ctx.db
      .delete(users)
      .where(and(eq(users.role, "admin"), ne(users.email, "playwright@rihlamate.test")));
    return { success: true };
  }),

  setupAdmin: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Check if any admin user already exists (excluding the
      //    seeded playwright test user, which is preserved by
      //    resetForTesting for use by other test suites)
      const existingAdmin = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, "admin"), ne(users.email, "playwright@rihlamate.test")))
        .limit(1);

      if (existingAdmin.length > 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin account already exists. Setup can only be run once.",
        });
      }

      // 2. Create the admin user via Better Auth's sign-up API
      const result = await getAuth().api.signUpEmail({
        body: {
          email: input.email,
          password: input.password,
          name: input.name,
        },
      });

      // 3. Elevate the user to admin role
      await ctx.db.update(users).set({ role: "admin" }).where(eq(users.id, result.user.id));

      return {
        success: true,
        userId: result.user.id,
      };
    }),

  systemCheck: publicProcedure.query(async ({ ctx }) => {
    let database = false;
    let diskSpace: { available: number; total: number } | null = null;

    // Database connectivity check
    try {
      await ctx.db.execute(sql`SELECT 1`);
      database = true;
    } catch {
      database = false;
    }

    // Disk space check
    try {
      const { execSync } = await import("child_process");
      const output = execSync("df -BG / | tail -1", {
        encoding: "utf-8",
      })
        .toString()
        .trim();
      const parts = output.split(/\s+/);
      // df -BG / | tail -1 output example:
      // /dev/sda1  50G  20G  30G  40% /
      // columns: Filesystem, Size(1G-blocks), Used, Avail, Use%, Mounted on
      const totalStr = parts[1]; // e.g. "50G"
      const availStr = parts[3]; // e.g. "30G"
      const total = parseInt(totalStr.replace("G", ""), 10);
      const available = parseInt(availStr.replace("G", ""), 10);
      diskSpace = { available, total };
    } catch {
      diskSpace = null;
    }

    return {
      database,
      diskSpace,
      nodeVersion: process.version,
      timestamp: Date.now(),
    };
  }),
});
