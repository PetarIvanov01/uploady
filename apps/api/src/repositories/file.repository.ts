import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { database, type Database } from "../database";
import { files, fileVersions, uploadSessions } from "../database/schema";

export interface CreateSingleUploadSessionInput {
  checksum: string;
  expiresAt: Date;
  name: string;
  size: number;
  type: string;
  userId: string;
}

export interface CreatedSingleUploadSession {
  expiresAt: Date;
  fileId: string;
  objectKey: string;
  uploadSessionId: string;
}

export interface SingleUploadSessionRecord {
  contentType: string;
  expiresAt: Date;
  fileId: string;
  fileVersionId: string;
  objectKey: string;
  status: (typeof uploadSessions.$inferSelect)["status"];
  totalSizeBytes: number;
  uploadSessionId: string;
}

interface FileRepositoryDependencies {
  database: Database;
}

export type FileRepository = ReturnType<typeof initFileRepository>;

export function initFileRepository({ database }: FileRepositoryDependencies) {
  async function createSingleUploadSession(
    input: CreateSingleUploadSessionInput,
  ): Promise<CreatedSingleUploadSession> {
    const objectKey = `users/${input.userId}/${randomUUID()}`;

    return database.transaction(async (tx) => {
      const [file] = await tx
        .insert(files)
        .values({
          userId: input.userId,
          name: input.name,
          status: "UPLOADING",
        })
        .returning({ id: files.id });

      const [fileVersion] = await tx
        .insert(fileVersions)
        .values({
          checksum: input.checksum,
          contentType: input.type,
          fileId: file.id,
          objectKey,
          sizeBytes: input.size,
          status: "PENDING",
          version: 1,
        })
        .returning({ id: fileVersions.id });

      const [uploadSession] = await tx
        .insert(uploadSessions)
        .values({
          expectedParts: 1,
          expiresAt: input.expiresAt,
          fileId: file.id,
          fileVersionId: fileVersion.id,
          mode: "SINGLE",
          objectKey,
          partSizeBytes: input.size,
          status: "UPLOADING",
          totalSizeBytes: input.size,
        })
        .returning({
          expiresAt: uploadSessions.expiresAt,
          id: uploadSessions.id,
        });

      return {
        expiresAt: uploadSession.expiresAt,
        fileId: file.id,
        objectKey,
        uploadSessionId: uploadSession.id,
      };
    });
  }

  async function findSingleUploadSession(
    fileId: string,
    uploadSessionId: string,
  ): Promise<SingleUploadSessionRecord | null> {
    const [record] = await database
      .select({
        contentType: fileVersions.contentType,
        expiresAt: uploadSessions.expiresAt,
        fileId: uploadSessions.fileId,
        fileVersionId: uploadSessions.fileVersionId,
        objectKey: uploadSessions.objectKey,
        status: uploadSessions.status,
        totalSizeBytes: uploadSessions.totalSizeBytes,
        uploadSessionId: uploadSessions.id,
      })
      .from(uploadSessions)
      .innerJoin(
        fileVersions,
        eq(uploadSessions.fileVersionId, fileVersions.id),
      )
      .where(
        and(
          eq(uploadSessions.id, uploadSessionId),
          eq(uploadSessions.fileId, fileId),
          eq(uploadSessions.mode, "SINGLE"),
        ),
      )
      .limit(1);

    return record
      ? {
          ...record,
          contentType: record.contentType ?? "application/octet-stream",
        }
      : null;
  }

  async function completeSingleUploadSession(
    session: SingleUploadSessionRecord,
  ): Promise<boolean> {
    return database.transaction(async (tx) => {
      const [claimedSession] = await tx
        .update(uploadSessions)
        .set({ status: "COMPLETING" })
        .where(
          and(
            eq(uploadSessions.id, session.uploadSessionId),
            eq(uploadSessions.fileId, session.fileId),
            eq(uploadSessions.mode, "SINGLE"),
          ),
        )
        .returning({ id: uploadSessions.id });

      if (!claimedSession) {
        return false;
      }

      await tx
        .update(fileVersions)
        .set({ status: "READY" })
        .where(eq(fileVersions.id, session.fileVersionId));

      await tx
        .update(files)
        .set({
          currentVersionId: session.fileVersionId,
          status: "READY",
          updatedAt: new Date(),
        })
        .where(eq(files.id, session.fileId));

      await tx
        .update(uploadSessions)
        .set({ completedAt: new Date(), status: "COMPLETED" })
        .where(eq(uploadSessions.id, session.uploadSessionId));

      return true;
    });
  }

  async function failSingleUploadSession(
    session: SingleUploadSessionRecord,
  ): Promise<void> {
    await database.transaction(async (tx) => {
      await tx
        .update(uploadSessions)
        .set({ status: "FAILED" })
        .where(eq(uploadSessions.id, session.uploadSessionId));
      await tx
        .update(fileVersions)
        .set({ status: "FAILED" })
        .where(eq(fileVersions.id, session.fileVersionId));
      await tx
        .update(files)
        .set({ status: "FAILED", updatedAt: new Date() })
        .where(eq(files.id, session.fileId));
    });
  }

  return {
    completeSingleUploadSession,
    createSingleUploadSession,
    failSingleUploadSession,
    findSingleUploadSession,
  };
}

export const fileRepository = initFileRepository({ database });
