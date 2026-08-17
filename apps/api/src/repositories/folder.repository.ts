import { and, eq } from "drizzle-orm";
import { database, type Database } from "../database";
import { folders } from "../database/schema";

export type FolderRecord = typeof folders.$inferSelect;

export interface CreateFolderInput {
  name: string;
  parentFolderId: string | null;
  userId: string;
}

export interface UpdateFolderInput {
  name?: string;
  parentFolderId?: string | null;
}

export type RemoveFolderResult = "DELETED" | "NOT_FOUND";

interface FolderRepositoryDependencies {
  database: Database;
}

export type FolderRepository = ReturnType<typeof initFolderRepository>;

export function initFolderRepository({
  database,
}: FolderRepositoryDependencies) {
  async function findById(
    id: string,
    userId: string,
  ): Promise<FolderRecord | null> {
    const [folder] = await database
      .select()
      .from(folders)
      .where(and(eq(folders.id, id), eq(folders.userId, userId)))
      .limit(1);

    return folder ?? null;
  }

  async function create(input: CreateFolderInput): Promise<FolderRecord> {
    const [folder] = await database.insert(folders).values(input).returning();

    return folder;
  }

  async function update(
    id: string,
    userId: string,
    input: UpdateFolderInput,
  ): Promise<FolderRecord | null> {
    const [folder] = await database
      .update(folders)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(folders.id, id), eq(folders.userId, userId)))
      .returning();

    return folder ?? null;
  }

  async function remove(
    id: string,
    userId: string,
  ): Promise<RemoveFolderResult> {
    const [folder] = await database
      .delete(folders)
      .where(and(eq(folders.id, id), eq(folders.userId, userId)))
      .returning({ id: folders.id });

    return folder ? "DELETED" : "NOT_FOUND";
  }

  return { create, findById, remove, update };
}

export const folderRepository = initFolderRepository({ database });
