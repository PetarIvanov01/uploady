import {
  bigint,
  type AnyPgColumn,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const fileStatus = pgEnum("file_status", [
  "UPLOADING",
  "READY",
  "FAILED",
  "DELETED",
]);

export const fileVersionStatus = pgEnum("file_version_status", [
  "PENDING",
  "READY",
  "FAILED",
]);

export const uploadSessionStatus = pgEnum("upload_session_status", [
  "CREATED",
  "UPLOADING",
  "COMPLETING",
  "COMPLETED",
  "ABORTED",
  "FAILED",
]);

export const uploadMode = pgEnum("upload_mode", ["SINGLE", "MULTIPART"]);

export const uploadPartStatus = pgEnum("upload_part_status", [
  "PENDING",
  "UPLOADED",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const files = pgTable("files", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  currentVersionId: uuid("current_version_id").references(
    (): AnyPgColumn => fileVersions.id,
    { onDelete: "set null" },
  ),
  status: fileStatus("status").default("UPLOADING").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const fileVersions = pgTable(
  "file_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fileId: uuid("file_id")
      .notNull()
      .references((): AnyPgColumn => files.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    objectKey: varchar("object_key", { length: 1024 }).notNull(),
    contentType: varchar("content_type", { length: 255 }),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    checksum: varchar("checksum", { length: 128 }),
    status: fileVersionStatus("status").default("PENDING").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("file_versions_file_id_version_unique").on(
      table.fileId,
      table.version,
    ),
  ],
);

export const uploadSessions = pgTable("upload_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  fileId: uuid("file_id")
    .notNull()
    .references(() => files.id, { onDelete: "cascade" }),
  fileVersionId: uuid("file_version_id")
    .notNull()
    .references(() => fileVersions.id, { onDelete: "cascade" }),
  storageUploadId: varchar("storage_upload_id", { length: 255 }),
  objectKey: varchar("object_key", { length: 1024 }).notNull(),
  status: uploadSessionStatus("status").default("CREATED").notNull(),
  mode: uploadMode("mode").notNull(),
  totalSizeBytes: bigint("total_size_bytes", { mode: "number" }).notNull(),
  partSizeBytes: bigint("part_size_bytes", { mode: "number" }).notNull(),
  expectedParts: integer("expected_parts").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const uploadParts = pgTable(
  "upload_parts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    uploadSessionId: uuid("upload_session_id")
      .notNull()
      .references(() => uploadSessions.id, { onDelete: "cascade" }),
    partNumber: integer("part_number").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    etag: varchar("etag", { length: 255 }),
    checksum: varchar("checksum", { length: 128 }),
    status: uploadPartStatus("status").default("PENDING").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
  },
  (table) => [
    unique("upload_parts_session_id_part_number_unique").on(
      table.uploadSessionId,
      table.partNumber,
    ),
  ],
);
