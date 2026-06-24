import { pgTable, uuid, varchar, text, integer, numeric, jsonb, timestamp } from "drizzle-orm/pg-core";

export const packages = pgTable("packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  durationDays: integer("duration_days").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("IDR"),
  itinerary: jsonb("itinerary").notNull().default("[]"),
  inclusions: jsonb("inclusions").notNull().default("[]"),
  exclusions: jsonb("exclusions").notNull().default("[]"),
  departureCity: varchar("departure_city", { length: 100 }),
  availableDates: jsonb("available_dates").notNull().default("[]"),
  featuredImage: text("featured_image"),
  gallery: jsonb("gallery").notNull().default("[]"),
  category: varchar("category", { length: 50 }).notNull().default("standard"),
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
