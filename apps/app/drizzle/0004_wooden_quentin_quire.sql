ALTER TABLE "bookings" ADD COLUMN "midtrans_order_id" varchar(255);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "midtrans_transaction_id" varchar(255);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "payment_method" varchar(50);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "payment_channel" varchar(100);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "gross_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "transaction_status" varchar(50);