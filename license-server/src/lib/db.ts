import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../db/schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}
const sql = neon(databaseUrl);

export const db = drizzle(sql, { schema });

export { schema };

export { eq, and, or, desc, asc, sql, count } from "drizzle-orm";
