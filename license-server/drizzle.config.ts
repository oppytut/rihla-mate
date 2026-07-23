import type { Config } from "drizzle-kit";

// generate does not need a live DB; migrate uses LICENSE_DATABASE_URL / DATABASE_URL at runtime.
const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://placeholder:placeholder@localhost:5432/license";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
