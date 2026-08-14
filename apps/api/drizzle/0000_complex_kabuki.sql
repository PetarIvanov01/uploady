CREATE TABLE "uploaded_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"size" bigint NOT NULL,
	"mime_type" text NOT NULL,
	"last_modified" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
