import { pgTable, uuid, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  domain: varchar("domain", { length: 255 }).unique(),
  branding: jsonb("branding").notNull().default("{}"),
  seoDefaults: jsonb("seo_defaults").notNull().default("{}"),
  contact: jsonb("contact").notNull().default("{}"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  plan: varchar("plan", { length: 50 }).notNull().default("starter"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
