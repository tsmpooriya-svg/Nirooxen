CREATE TABLE "search_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"term" varchar(120) NOT NULL,
	"result_count" integer NOT NULL,
	"source" varchar(16) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "search_queries_created_idx" ON "search_queries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "search_queries_term_idx" ON "search_queries" USING btree ("term");--> statement-breakpoint
CREATE INDEX "search_queries_empty_idx" ON "search_queries" USING btree ("result_count","created_at");