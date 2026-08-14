CREATE TYPE "public"."file_status" AS ENUM('UPLOADING', 'READY', 'FAILED', 'DELETED');--> statement-breakpoint
CREATE TYPE "public"."file_version_status" AS ENUM('PENDING', 'READY', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."upload_mode" AS ENUM('SINGLE', 'MULTIPART');--> statement-breakpoint
CREATE TYPE "public"."upload_part_status" AS ENUM('PENDING', 'UPLOADED');--> statement-breakpoint
CREATE TYPE "public"."upload_session_status" AS ENUM('CREATED', 'UPLOADING', 'COMPLETING', 'COMPLETED', 'ABORTED', 'FAILED');--> statement-breakpoint
CREATE TABLE "file_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"object_key" varchar(1024) NOT NULL,
	"content_type" varchar(255),
	"size_bytes" bigint NOT NULL,
	"checksum" varchar(128),
	"status" "file_version_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "file_versions_file_id_version_unique" UNIQUE("file_id","version")
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"current_version_id" uuid,
	"status" "file_status" DEFAULT 'UPLOADING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"upload_session_id" uuid NOT NULL,
	"part_number" integer NOT NULL,
	"size_bytes" bigint,
	"etag" varchar(255),
	"checksum" varchar(128),
	"status" "upload_part_status" DEFAULT 'PENDING' NOT NULL,
	"uploaded_at" timestamp with time zone,
	CONSTRAINT "upload_parts_session_id_part_number_unique" UNIQUE("upload_session_id","part_number")
);
--> statement-breakpoint
CREATE TABLE "upload_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"file_version_id" uuid NOT NULL,
	"storage_upload_id" varchar(255),
	"object_key" varchar(1024) NOT NULL,
	"status" "upload_session_status" DEFAULT 'CREATED' NOT NULL,
	"mode" "upload_mode" NOT NULL,
	"total_size_bytes" bigint NOT NULL,
	"part_size_bytes" bigint NOT NULL,
	"expected_parts" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_current_version_id_file_versions_id_fk" FOREIGN KEY ("current_version_id") REFERENCES "public"."file_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_parts" ADD CONSTRAINT "upload_parts_upload_session_id_upload_sessions_id_fk" FOREIGN KEY ("upload_session_id") REFERENCES "public"."upload_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_file_version_id_file_versions_id_fk" FOREIGN KEY ("file_version_id") REFERENCES "public"."file_versions"("id") ON DELETE cascade ON UPDATE no action;