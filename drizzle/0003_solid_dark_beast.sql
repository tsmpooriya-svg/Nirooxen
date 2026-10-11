CREATE TABLE "product_price_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"source_ref" varchar(64) NOT NULL,
	"source_date" varchar(16) DEFAULT '' NOT NULL,
	"raw_price" varchar(32),
	"normalized_price" numeric(20, 0),
	"price_scale" integer DEFAULT 1 NOT NULL,
	"final_price" integer,
	"currency" varchar(8),
	"price_status" varchar(32),
	"condition_code" varchar(32),
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "price_condition_code" varchar(32);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "price_condition_text" varchar(200);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_promotional" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "source_ref" varchar(64);--> statement-breakpoint
ALTER TABLE "product_price_observations" ADD CONSTRAINT "product_price_observations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "price_obs_unique" ON "product_price_observations" USING btree ("product_id","source_ref","source_date");--> statement-breakpoint
CREATE INDEX "price_obs_product_idx" ON "product_price_observations" USING btree ("product_id","source_date");