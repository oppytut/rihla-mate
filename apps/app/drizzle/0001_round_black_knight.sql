ALTER TABLE "bookings" DROP CONSTRAINT "bookings_package_id_packages_id_fk";
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "departure_date" date NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;