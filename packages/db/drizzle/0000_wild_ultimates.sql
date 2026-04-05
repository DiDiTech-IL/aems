CREATE TYPE "public"."care_level" AS ENUM('BLS', 'ALS');--> statement-breakpoint
CREATE TYPE "public"."case_status" AS ENUM('draft', 'published', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."protocol_status" AS ENUM('draft', 'published', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."rbac_role" AS ENUM('admin', 'instructor', 'trainee', 'observer');--> statement-breakpoint
CREATE TYPE "public"."simulation_outcome" AS ENUM('success', 'failure', 'partial');--> statement-breakpoint
CREATE TYPE "public"."simulation_status" AS ENUM('pending', 'active', 'paused', 'completed', 'aborted');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" varchar(255) NOT NULL,
	"resource_type" varchar(64) NOT NULL,
	"resource_id" uuid NOT NULL,
	"diff" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"version" varchar(20) NOT NULL,
	"status" "case_status" DEFAULT 'draft' NOT NULL,
	"care_level" "care_level" NOT NULL,
	"difficulty_level" integer DEFAULT 1 NOT NULL,
	"scenario" jsonb NOT NULL,
	"initial_patient_state" jsonb NOT NULL,
	"allowed_protocol_ids" jsonb NOT NULL,
	"rules" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "protocol_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"version" varchar(20) NOT NULL,
	"status" "protocol_status" DEFAULT 'draft' NOT NULL,
	"care_level" "care_level" NOT NULL,
	"phases" jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "simulation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"simulation_run_id" uuid NOT NULL,
	"timestamp_ms" integer NOT NULL,
	"type" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "simulation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_template_id" uuid NOT NULL,
	"case_template_version" varchar(20) NOT NULL,
	"protocol_template_id" uuid NOT NULL,
	"protocol_template_version" varchar(20) NOT NULL,
	"trainee_id" uuid NOT NULL,
	"instructor_id" uuid,
	"status" "simulation_status" DEFAULT 'pending' NOT NULL,
	"difficulty_level" integer DEFAULT 1 NOT NULL,
	"current_patient_state" jsonb NOT NULL,
	"current_phase_id" varchar(255) NOT NULL,
	"score" jsonb,
	"outcome" "simulation_outcome",
	"mistake_log" jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "rbac_role" DEFAULT 'trainee' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_templates" ADD CONSTRAINT "case_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_templates" ADD CONSTRAINT "protocol_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_events" ADD CONSTRAINT "simulation_events_simulation_run_id_simulation_runs_id_fk" FOREIGN KEY ("simulation_run_id") REFERENCES "public"."simulation_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_runs" ADD CONSTRAINT "simulation_runs_case_template_id_case_templates_id_fk" FOREIGN KEY ("case_template_id") REFERENCES "public"."case_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_runs" ADD CONSTRAINT "simulation_runs_protocol_template_id_protocol_templates_id_fk" FOREIGN KEY ("protocol_template_id") REFERENCES "public"."protocol_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_runs" ADD CONSTRAINT "simulation_runs_trainee_id_users_id_fk" FOREIGN KEY ("trainee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulation_runs" ADD CONSTRAINT "simulation_runs_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;