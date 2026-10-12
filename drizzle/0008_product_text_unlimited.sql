ALTER TABLE "product_images" ALTER COLUMN "alt" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "name" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "slug" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "sku" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "model" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "price_condition_code" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "price_condition_text" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "unit" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "unit" SET DEFAULT 'دستگاه';--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "meta_title" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "source_ref" SET DATA TYPE text;