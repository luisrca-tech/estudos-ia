CREATE TYPE "cadence" AS ENUM('daily', 'weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "note_source" AS ENUM('app', 'html_import');--> statement-breakpoint
CREATE TYPE "note_type" AS ENUM('summary', 'question', 'decision', 'evidence');--> statement-breakpoint
CREATE TYPE "review_result" AS ENUM('recalled', 'forgot');--> statement-breakpoint
CREATE TYPE "session_status" AS ENUM('running', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "module_content_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"module_id" uuid NOT NULL,
	"hash" text NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "module_content_version_module_hash_unique" UNIQUE("module_id","hash")
);
--> statement-breakpoint
CREATE TABLE "module_progress" (
	"module_id" uuid PRIMARY KEY,
	"mastery_level" smallint DEFAULT 0 NOT NULL,
	"last_seen_content_hash" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "module_progress_mastery_level_check" CHECK ("mastery_level" between 0 and 5)
);
--> statement-breakpoint
CREATE TABLE "routine_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" text NOT NULL CONSTRAINT "routine_item_slug_unique" UNIQUE,
	"cadence" "cadence" NOT NULL,
	"order" smallint NOT NULL,
	"label" text NOT NULL,
	"hint" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "module" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" text NOT NULL CONSTRAINT "module_slug_unique" UNIQUE,
	"key" text NOT NULL CONSTRAINT "module_key_unique" UNIQUE,
	"part" smallint NOT NULL,
	"order" smallint NOT NULL,
	"title" text NOT NULL,
	"content" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_batch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"file_name" text NOT NULL,
	"format" text NOT NULL,
	"file_hash" text NOT NULL,
	"notes_created" integer NOT NULL,
	"notes_skipped" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"module_id" uuid NOT NULL,
	"session_id" uuid,
	"type" "note_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"recall_prompt" text,
	"evidence_grade" char(1),
	"source_url" text,
	"source" "note_source" DEFAULT 'app'::"note_source" NOT NULL,
	"import_batch_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "note_evidence_grade_check" CHECK ("evidence_grade" is null or "evidence_grade" in ('A', 'B', 'C', 'D', 'E'))
);
--> statement-breakpoint
CREATE TABLE "review_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"note_id" uuid NOT NULL,
	"step_before" smallint NOT NULL,
	"result" "review_result" NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_schedule" (
	"note_id" uuid PRIMARY KEY,
	"step" smallint DEFAULT 0 NOT NULL,
	"due_on" date,
	"graduated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine_check" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"routine_item_id" uuid NOT NULL,
	"period_key" text NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "routine_check_item_period_unique" UNIQUE("routine_item_id","period_key")
);
--> statement-breakpoint
CREATE TABLE "study_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"module_id" uuid NOT NULL,
	"planned_minutes" smallint NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_seconds" integer,
	"status" "session_status" DEFAULT 'running'::"session_status" NOT NULL
);
--> statement-breakpoint
CREATE INDEX "note_module_created_idx" ON "note" ("module_id","created_at");--> statement-breakpoint
CREATE INDEX "note_type_idx" ON "note" ("type");--> statement-breakpoint
CREATE INDEX "review_log_note_idx" ON "review_log" ("note_id");--> statement-breakpoint
CREATE INDEX "review_schedule_due_on_idx" ON "review_schedule" ("due_on");--> statement-breakpoint
CREATE UNIQUE INDEX "study_session_single_running_idx" ON "study_session" ("status") WHERE "status" = 'running';--> statement-breakpoint
CREATE INDEX "study_session_module_idx" ON "study_session" ("module_id","started_at");--> statement-breakpoint
ALTER TABLE "module_content_version" ADD CONSTRAINT "module_content_version_module_id_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "module"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "module_progress" ADD CONSTRAINT "module_progress_module_id_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "module"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_module_id_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "module"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_session_id_study_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "study_session"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_import_batch_id_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batch"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "review_log" ADD CONSTRAINT "review_log_note_id_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "note"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "review_schedule" ADD CONSTRAINT "review_schedule_note_id_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "note"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "routine_check" ADD CONSTRAINT "routine_check_routine_item_id_routine_item_id_fkey" FOREIGN KEY ("routine_item_id") REFERENCES "routine_item"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "study_session" ADD CONSTRAINT "study_session_module_id_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "module"("id") ON DELETE RESTRICT;