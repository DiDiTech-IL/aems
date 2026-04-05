-- Migration: Replace custom JWT auth with Clerk identity
-- Users.id changes from uuid to varchar(255) (Clerk user ID format: "user_xxx").
-- password_hash column is dropped — Clerk owns credentials.
-- All FK columns pointing to users.id change type accordingly.
-- Enums and other tables are unchanged.

--> statement-breakpoint
-- Drop FK constraints that reference users.id (must be dropped before altering column types)
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_actor_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "case_templates" DROP CONSTRAINT "case_templates_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "protocol_templates" DROP CONSTRAINT "protocol_templates_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "simulation_runs" DROP CONSTRAINT "simulation_runs_trainee_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "simulation_runs" DROP CONSTRAINT "simulation_runs_instructor_id_users_id_fk";
--> statement-breakpoint

-- Drop password_hash — Clerk owns credentials, we never store them
ALTER TABLE "users" DROP COLUMN "password_hash";
--> statement-breakpoint

-- Change users.id from uuid to varchar(255) for Clerk user IDs
ALTER TABLE "users" ALTER COLUMN "id" TYPE varchar(255) USING "id"::text;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;
--> statement-breakpoint

-- Change FK columns in referencing tables to varchar(255)
ALTER TABLE "audit_log" ALTER COLUMN "actor_id" TYPE varchar(255) USING "actor_id"::text;
--> statement-breakpoint
ALTER TABLE "case_templates" ALTER COLUMN "created_by" TYPE varchar(255) USING "created_by"::text;
--> statement-breakpoint
ALTER TABLE "protocol_templates" ALTER COLUMN "created_by" TYPE varchar(255) USING "created_by"::text;
--> statement-breakpoint
ALTER TABLE "simulation_runs" ALTER COLUMN "trainee_id" TYPE varchar(255) USING "trainee_id"::text;
--> statement-breakpoint
ALTER TABLE "simulation_runs" ALTER COLUMN "instructor_id" TYPE varchar(255) USING "instructor_id"::text;
--> statement-breakpoint

-- Recreate FK constraints
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "case_templates" ADD CONSTRAINT "case_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "protocol_templates" ADD CONSTRAINT "protocol_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "simulation_runs" ADD CONSTRAINT "simulation_runs_trainee_id_users_id_fk" FOREIGN KEY ("trainee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "simulation_runs" ADD CONSTRAINT "simulation_runs_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
