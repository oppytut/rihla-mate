import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ─── Customers ───────────────────────────────────────────────────────────────

export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Licenses ────────────────────────────────────────────────────────────────

export const licenses = pgTable(
  "licenses",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    plan: text("plan", { enum: ["starter", "pro", "enterprise"] })
      .notNull(),
    features: jsonb("features").notNull().$type<string[]>().default([]),
    maxTenants: integer("max_tenants").notNull().default(1),
    maxMonthlyBookings: integer("max_monthly_bookings").notNull().default(100),
    expiresAt: timestamp("expires_at").notNull(),
    gracePeriodDays: integer("grace_period_days").notNull().default(7),
    isTrial: boolean("is_trial").notNull().default(false),
    trialDays: integer("trial_days").notNull().default(14),
    status: text("status", {
      enum: ["active", "revoked", "expired"],
    })
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("licenses_customer_idx").on(table.customerId),
    index("licenses_status_idx").on(table.status),
  ]
);

// ─── Activations ─────────────────────────────────────────────────────────────

export const activations = pgTable(
  "activations",
  {
    id: text("id").primaryKey(),
    licenseId: text("license_id")
      .notNull()
      .references(() => licenses.id),
    instanceId: text("instance_id").notNull(),
    domain: text("domain"),
    ipAddress: text("ip_address"),
    activatedAt: timestamp("activated_at").notNull().defaultNow(),
  },
  (table) => [
    index("activations_license_idx").on(table.licenseId),
    index("activations_instance_idx").on(table.instanceId),
  ]
);

// ─── Check-ins ───────────────────────────────────────────────────────────────

export const checkins = pgTable(
  "checkins",
  {
    id: text("id").primaryKey(),
    licenseId: text("license_id")
      .notNull()
      .references(() => licenses.id),
    instanceId: text("instance_id").notNull(),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    ipAddress: text("ip_address"),
  },
  (table) => [
    index("checkins_license_idx").on(table.licenseId),
    index("checkins_timestamp_idx").on(table.timestamp),
  ]
);

// ─── Domain Changes ──────────────────────────────────────────────────────────

export const domainChanges = pgTable(
  "domain_changes",
  {
    id: text("id").primaryKey(),
    licenseId: text("license_id")
      .notNull()
      .references(() => licenses.id),
    oldDomain: text("old_domain"),
    newDomain: text("new_domain").notNull(),
    changedAt: timestamp("changed_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
  },
  (table) => [
    index("domain_changes_license_idx").on(table.licenseId),
  ]
);

// ─── API Keys ────────────────────────────────────────────────────────────────

export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at"),
  },
  (table) => [
    uniqueIndex("api_keys_key_idx").on(table.key),
  ]
);
