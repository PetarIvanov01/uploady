import { desc, eq } from "drizzle-orm";
import type { Database } from "../database";
import { uploadedFiles } from "../database/schema";

export type CreateFileRecord = typeof uploadedFiles.$inferInsert;
export type FileRecord = typeof uploadedFiles.$inferSelect;

interface FileRepositoryDependencies {
  database: Database;
}

export type FileRepository = ReturnType<typeof initFileRepository>;

export function initFileRepository({ database }: FileRepositoryDependencies) {
  async function create(file: CreateFileRecord): Promise<FileRecord> {
    const [createdFile] = await database
      .insert(uploadedFiles)
      .values(file)
      .returning();

    if (!createdFile) {
      throw new Error("Failed to persist uploaded file metadata");
    }

    return createdFile;
  }

  async function findById(id: string): Promise<FileRecord | null> {
    const [file] = await database
      .select()
      .from(uploadedFiles)
      .where(eq(uploadedFiles.id, id))
      .limit(1);

    return file ?? null;
  }

  async function findAll(): Promise<FileRecord[]> {
    return database
      .select()
      .from(uploadedFiles)
      .orderBy(desc(uploadedFiles.createdAt));
  }

  return {
    create,
    findAll,
    findById,
  };
}
