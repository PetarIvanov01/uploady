import { bigint, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const uploadedFiles = pgTable("uploaded_files", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  mimeType: text("mime_type").notNull(),
  lastModified: bigint("last_modified", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
