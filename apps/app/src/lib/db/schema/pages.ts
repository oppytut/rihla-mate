import { pgTable, uuid, varchar, jsonb, boolean, timestamp } from "drizzle-orm/pg-core";

export const pages = pgTable("landing_pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: varchar("template_id", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  content: jsonb("content").notNull().default("{}"),
  seo: jsonb("seo").notNull().default("{}"),
  isPublished: boolean("is_published").notNull().default(false),
  isHomepage: boolean("is_homepage").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
