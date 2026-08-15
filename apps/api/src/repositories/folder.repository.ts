import { and, eq, isNull } from "drizzle-orm";
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

export type RemoveFolderResult = "DELETED" | "NOT_EMPTY" | "NOT_FOUND";

interface FolderRepositoryDependencies {
  database: Database;
}

export type FolderRepository = ReturnType<typeof initFolderRepository>;

export function initFolderRepository({
  database,
}: FolderRepositoryDependencies) {
  async function findAll(
    userId: string,
    parentFolderId: string | null,
  ): Promise<FolderRecord[]> {
    return database
      .select()
      .from(folders)
      .where(
        and(
          eq(folders.userId, userId),
          parentFolderId === null
            ? isNull(folders.parentFolderId)
            : eq(folders.parentFolderId, parentFolderId),
        ),
      );
  }

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
    try {
      const [folder] = await database
        .delete(folders)
        .where(and(eq(folders.id, id), eq(folders.userId, userId)))
        .returning({ id: folders.id });

      return folder ? "DELETED" : "NOT_FOUND";
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23503"
      ) {
        return "NOT_EMPTY";
      }

      throw error;
    }
  }

  return { create, findAll, findById, remove, update };
}

export const folderRepository = initFolderRepository({ database });
