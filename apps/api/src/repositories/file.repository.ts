import { database, type Database } from "../database";

export interface CreateUploadSessionInput {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface FileRecord {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  lastModified: number;
  createdAt: Date;
}

interface FileRepositoryDependencies {
  database: Database;
}

export type FileRepository = ReturnType<typeof initFileRepository>;

export function initFileRepository({ database }: FileRepositoryDependencies) {
  async function findAll(): Promise<FileRecord[]> {
    void database;
    return [];
  }

  async function findById(_id: string): Promise<FileRecord | null> {
    return null;
  }

  async function createSession(
    _input: CreateUploadSessionInput,
  ): Promise<FileRecord> {
    throw new Error("Upload session persistence is not implemented yet");
  }

  return {
    createSession,
    findAll,
    findById,
  };
}

export const fileRepository = initFileRepository({ database });
