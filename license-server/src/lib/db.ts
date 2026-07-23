import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../db/schema";

type Db = NeonHttpDatabase<typeof schema>;

let _db: Db | undefined;

function createDb(): Db {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  return drizzle(neon(databaseUrl), { schema });
}

export function getDb(): Db {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
});

export { schema };

export { eq, and, or, desc, asc, sql, count } from "drizzle-orm";
