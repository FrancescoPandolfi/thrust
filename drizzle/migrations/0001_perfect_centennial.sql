CREATE TYPE "public"."user_role" AS ENUM('admin', 'viewer');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'admin' NOT NULL;