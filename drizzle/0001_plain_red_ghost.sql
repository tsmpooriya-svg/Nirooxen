CREATE TYPE "public"."spec_data_type" AS ENUM('NUMBER', 'RANGE', 'TEXT', 'BOOLEAN');--> statement-breakpoint
CREATE TYPE "public"."spec_filter_ui" AS ENUM('RANGE', 'CHECKBOX', 'BOOLEAN', 'NONE');--> statement-breakpoint
CREATE TYPE "public"."unit_dimension" AS ENUM('POWER', 'LENGTH', 'FLOW', 'PRESSURE', 'VOLUME', 'TEMPERATURE', 'VOLTAGE', 'MASS', 'ROTATION', 'COUNT', 'OTHER');--> statement-breakpoint
CREATE TABLE "category_specs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"definition_id" uuid NOT NULL,
	"is_filterable" boolean,
	"is_key" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spec_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(64) NOT NULL,
	"label" varchar(160) NOT NULL,
	"description" text,
	"data_type" "spec_data_type" DEFAULT 'TEXT' NOT NULL,
	"dimension" "unit_dimension",
	"default_unit_id" uuid,
	"group_name" varchar(120) DEFAULT 'مشخصات عمومی' NOT NULL,
	"is_filterable" boolean DEFAULT false NOT NULL,
	"filter_ui" "spec_filter_ui" DEFAULT 'NONE' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"label" varchar(64) NOT NULL,
	"symbol" varchar(16),
	"dimension" "unit_dimension" DEFAULT 'OTHER' NOT NULL,
	"to_base_factor" numeric(20, 10) DEFAULT '1' NOT NULL,
	"is_base" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_specs" ADD COLUMN "definition_id" uuid;--> statement-breakpoint
ALTER TABLE "product_specs" ADD COLUMN "value_text" varchar(260);--> statement-breakpoint
ALTER TABLE "product_specs" ADD COLUMN "value_num" numeric(20, 6);--> statement-breakpoint
ALTER TABLE "product_specs" ADD COLUMN "value_num_max" numeric(20, 6);--> statement-breakpoint
ALTER TABLE "product_specs" ADD COLUMN "value_bool" boolean;--> statement-breakpoint
ALTER TABLE "product_specs" ADD COLUMN "unit_id" uuid;--> statement-breakpoint
ALTER TABLE "product_specs" ADD COLUMN "value_base" numeric(20, 6);--> statement-breakpoint
ALTER TABLE "product_specs" ADD COLUMN "value_base_max" numeric(20, 6);--> statement-breakpoint
ALTER TABLE "product_specs" ADD COLUMN "is_unparsed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "category_specs" ADD CONSTRAINT "category_specs_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_specs" ADD CONSTRAINT "category_specs_definition_id_spec_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."spec_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spec_definitions" ADD CONSTRAINT "spec_definitions_default_unit_id_units_id_fk" FOREIGN KEY ("default_unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "category_specs_key" ON "category_specs" USING btree ("category_id","definition_id");--> statement-breakpoint
CREATE INDEX "category_specs_category_idx" ON "category_specs" USING btree ("category_id","position");--> statement-breakpoint
CREATE INDEX "category_specs_definition_idx" ON "category_specs" USING btree ("definition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "spec_definitions_key_key" ON "spec_definitions" USING btree ("key");--> statement-breakpoint
CREATE INDEX "spec_definitions_active_idx" ON "spec_definitions" USING btree ("is_active","position");--> statement-breakpoint
CREATE INDEX "spec_definitions_filterable_idx" ON "spec_definitions" USING btree ("is_filterable","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "units_code_key" ON "units" USING btree ("code");--> statement-breakpoint
CREATE INDEX "units_dimension_idx" ON "units" USING btree ("dimension","position");--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_definition_id_spec_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."spec_definitions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_specs" ADD CONSTRAINT "product_specs_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_specs_numeric_filter_idx" ON "product_specs" USING btree ("definition_id","value_base");--> statement-breakpoint
CREATE INDEX "product_specs_text_filter_idx" ON "product_specs" USING btree ("definition_id","value_text");--> statement-breakpoint
CREATE INDEX "product_specs_definition_idx" ON "product_specs" USING btree ("definition_id");