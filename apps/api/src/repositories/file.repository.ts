import { and, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { database, type Database } from "../database";
import { files, fileVersions, uploadSessions } from "../database/schema";

export type UploadSessionMode = (typeof uploadSessions.$inferSelect)["mode"];

type FindUploadSessionInput = {
  uploadSessionId: string;
  userId: string;
  mode: UploadSessionMode;
};

export interface CreateUploadSessionInput {
  checksum?: string;
  expectedParts: number;
  expiresAt: Date;
  name: string;
  size: number;
  type: string;
  userId: string;
  mode: UploadSessionMode;
  partSizeBytes: number;
}

export interface CreatedUploadSession {
  expiresAt: Date;
  fileId: string;
  objectKey: string;
  uploadSessionId: string;
}

export interface UploadSessionRecord {
  contentType: string;
  expiresAt: Date;
  fileId: string;
  fileVersionId: string;
  objectKey: string;
  status: (typeof uploadSessions.$inferSelect)["status"];
  storageUploadId: string | null;
  totalSizeBytes: number;
  uploadSessionId: string;
  expectedParts: number;
}

export interface ActivateUploadSession {
  uploadSessionId: string;
  storageUploadId: string;
}

interface FileRepositoryDependencies {
  database: Database;
}

export function initFileRepository({ database }: FileRepositoryDependencies) {
  async function createUploadSession(
    input: CreateUploadSessionInput,
  ): Promise<CreatedUploadSession> {
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
          expectedParts: input.expectedParts,
          expiresAt: input.expiresAt,
          fileId: file.id,
          fileVersionId: fileVersion.id,
          mode: input.mode,
          objectKey,
          partSizeBytes: input.partSizeBytes,
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

  async function findUploadSession({
    uploadSessionId,
    userId,
    mode,
  }: FindUploadSessionInput): Promise<UploadSessionRecord | null> {
    const [record] = await database
      .select({
        contentType: fileVersions.contentType,
        expiresAt: uploadSessions.expiresAt,
        expectedParts: uploadSessions.expectedParts,
        fileId: uploadSessions.fileId,
        fileVersionId: uploadSessions.fileVersionId,
        objectKey: uploadSessions.objectKey,
        status: uploadSessions.status,
        storageUploadId: uploadSessions.storageUploadId,
        totalSizeBytes: uploadSessions.totalSizeBytes,
        uploadSessionId: uploadSessions.id,
      })
      .from(uploadSessions)
      .innerJoin(
        fileVersions,
        eq(uploadSessions.fileVersionId, fileVersions.id),
      )
      .innerJoin(files, eq(uploadSessions.fileId, files.id))
      .where(
        and(
          eq(uploadSessions.id, uploadSessionId),
          eq(files.userId, userId),
          eq(uploadSessions.mode, mode),
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

  async function completeUploadSession(
    session: UploadSessionRecord,
    mode: UploadSessionMode,
  ): Promise<boolean> {
    return database.transaction(async (tx) => {
      const [completedSession] = await tx
        .update(uploadSessions)
        .set({ completedAt: new Date(), status: "COMPLETED" })
        .where(
          and(
            eq(uploadSessions.id, session.uploadSessionId),
            eq(uploadSessions.fileId, session.fileId),
            eq(uploadSessions.mode, mode),
            eq(uploadSessions.status, "COMPLETING"),
          ),
        )
        .returning({ id: uploadSessions.id });

      if (!completedSession) {
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

      return true;
    });
  }

  async function claimUploadSessionCompletion(
    session: UploadSessionRecord,
    mode: UploadSessionMode,
  ): Promise<boolean> {
    const [claimedSession] = await database
      .update(uploadSessions)
      .set({ status: "COMPLETING" })
      .where(
        and(
          eq(uploadSessions.id, session.uploadSessionId),
          eq(uploadSessions.fileId, session.fileId),
          eq(uploadSessions.mode, mode),
          eq(uploadSessions.status, "UPLOADING"),
        ),
      )
      .returning({ id: uploadSessions.id });

    return Boolean(claimedSession);
  }

  async function releaseUploadSessionCompletion(
    session: UploadSessionRecord,
    mode: UploadSessionMode,
  ): Promise<void> {
    await database
      .update(uploadSessions)
      .set({ status: "UPLOADING" })
      .where(
        and(
          eq(uploadSessions.id, session.uploadSessionId),
          eq(uploadSessions.fileId, session.fileId),
          eq(uploadSessions.mode, mode),
          eq(uploadSessions.status, "COMPLETING"),
        ),
      );
  }

  async function failUploadSession(
    session: UploadSessionRecord,
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

  async function abortUploadSession(
    session: UploadSessionRecord,
  ): Promise<void> {
    await database.transaction(async (tx) => {
      await tx
        .update(uploadSessions)
        .set({ status: "ABORTED" })
        .where(
          and(
            eq(uploadSessions.id, session.uploadSessionId),
            inArray(uploadSessions.status, ["CREATED", "UPLOADING"]),
          ),
        );

      await tx
        .update(fileVersions)
        .set({ status: "FAILED" })
        .where(eq(fileVersions.id, session.fileVersionId));

      await tx
        .update(files)
        .set({
          status: "FAILED",
          updatedAt: new Date(),
        })
        .where(eq(files.id, session.fileId));
    });
  }

  async function activateUploadSession({
    uploadSessionId,
    storageUploadId,
  }: ActivateUploadSession): Promise<void> {
    await database
      .update(uploadSessions)
      .set({
        storageUploadId,
        status: "UPLOADING",
      })
      .where(eq(uploadSessions.id, uploadSessionId));
  }

  return {
    claimUploadSessionCompletion,
    completeUploadSession,
    createUploadSession,
    failUploadSession,
    findUploadSession,
    releaseUploadSessionCompletion,
    activateUploadSession,
    abortUploadSession,
  };
}

export const fileRepository = initFileRepository({ database });
