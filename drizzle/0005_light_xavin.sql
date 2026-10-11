CREATE TABLE "page_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"path" varchar(200) NOT NULL,
	"kind" varchar(16) NOT NULL,
	"referrer_host" varchar(120),
	"visitor" varchar(16) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "page_views_created_idx" ON "page_views" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "page_views_path_idx" ON "page_views" USING btree ("path","created_at");--> statement-breakpoint
CREATE INDEX "page_views_kind_idx" ON "page_views" USING btree ("kind","created_at");--> statement-breakpoint
CREATE INDEX "page_views_visitor_idx" ON "page_views" USING btree ("visitor","created_at");--> statement-breakpoint
CREATE INDEX "page_views_referrer_idx" ON "page_views" USING btree ("referrer_host","created_at");