CREATE TABLE IF NOT EXISTS "activations" (
	"id" text PRIMARY KEY NOT NULL,
	"license_id" text NOT NULL,
	"instance_id" text NOT NULL,
	"domain" text,
	"ip_address" text,
	"activated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	CONSTRAINT "api_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "checkins" (
	"id" text PRIMARY KEY NOT NULL,
	"license_id" text NOT NULL,
	"instance_id" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"ip_address" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "domain_changes" (
	"id" text PRIMARY KEY NOT NULL,
	"license_id" text NOT NULL,
	"old_domain" text,
	"new_domain" text NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "licenses" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"plan" text NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"max_tenants" integer DEFAULT 1 NOT NULL,
	"max_monthly_bookings" integer DEFAULT 100 NOT NULL,
	"expires_at" timestamp NOT NULL,
	"grace_period_days" integer DEFAULT 7 NOT NULL,
	"is_trial" boolean DEFAULT false NOT NULL,
	"trial_days" integer DEFAULT 14 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activations" ADD CONSTRAINT "activations_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checkins" ADD CONSTRAINT "checkins_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "domain_changes" ADD CONSTRAINT "domain_changes_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "licenses" ADD CONSTRAINT "licenses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activations_license_idx" ON "activations" USING btree ("license_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activations_instance_idx" ON "activations" USING btree ("instance_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "api_keys_key_idx" ON "api_keys" USING btree ("key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "checkins_license_idx" ON "checkins" USING btree ("license_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "checkins_timestamp_idx" ON "checkins" USING btree ("timestamp");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "domain_changes_license_idx" ON "domain_changes" USING btree ("license_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "licenses_customer_idx" ON "licenses" USING btree ("customer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "licenses_status_idx" ON "licenses" USING btree ("status");
