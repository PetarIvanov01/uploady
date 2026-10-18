import { fileRepository } from "../../repositories/file.repository";
import {
  getObjectMetadata,
  PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS,
  storage,
} from "../../s3";
import type {
  CompleteMultipartUploadInput,
  CompleteMultipartUploadResult,
  MultipartPartParams,
  MultipartPartUploadUrlResult,
  MultipartUploadInitResult,
  MultipartUploadInput,
} from "./multipart-upload.types";
import {
  MULTIPART_DEFAULT_PART_BYTES,
  MULTIPART_MAX_PARTS,
  MULTIPART_UPLOAD_SESSION_EXPIRES_IN_SECONDS,
  SINGLE_UPLOAD_LIMIT_BYTES,
} from "./upload.constants";
import { resolveUploadCompletionClaim } from "./upload-completion";
import { UploadError } from "./upload.errors";

// TODO: Replace this with the authenticated user's ID once auth is introduced.
const temporaryUserId = "9e9a548c-dced-4f30-958d-19d423b53028";

function calculatePartSize(size: number): number {
  return Math.max(
    MULTIPART_DEFAULT_PART_BYTES,
    Math.ceil(size / MULTIPART_MAX_PARTS),
  );
}

export async function initiateMultipartUpload(
  input: MultipartUploadInput,
): Promise<MultipartUploadInitResult> {
  if (input.size <= SINGLE_UPLOAD_LIMIT_BYTES) {
    throw new UploadError("MULTIPART_TOO_SMALL");
  }

  const expiresAt = new Date(
    Date.now() + MULTIPART_UPLOAD_SESSION_EXPIRES_IN_SECONDS * 1000,
  );

  const partSizeBytes = calculatePartSize(input.size);
  const session = await fileRepository.createUploadSession({
    ...input,
    expiresAt,
    userId: temporaryUserId,
    mode: "MULTIPART",
    partSizeBytes,
    expectedParts: Math.ceil(input.size / partSizeBytes),
  });

  try {
    const { uploadId } = await storage.createMultipartUpload(session.objectKey);

    await fileRepository.activateUploadSession({
      uploadSessionId: session.uploadSessionId,
      storageUploadId: uploadId,
    });

    return {
      uploadSessionId: session.uploadSessionId,
      partSizeBytes,
      expiresAt: session.expiresAt.toISOString(),
    };
  } catch (error) {
    // TODO: If the storage multipart upload was created successfully but
    // activating the DB session failed, abort the storage multipart upload
    // to avoid leaving orphaned/incomplete multipart uploads.

    const persistedSession = await fileRepository.findUploadSession({
      uploadSessionId: session.uploadSessionId,
      userId: temporaryUserId,
      mode: "MULTIPART",
    });

    if (persistedSession) {
      await fileRepository.failUploadSession(persistedSession);
    }

    throw error;
  }
}

export async function createMultipartPartUploadUrl(
  params: MultipartPartParams,
): Promise<MultipartPartUploadUrlResult> {
  const { partNumber, uploadSessionId } = params;
  const session = await fileRepository.findUploadSession({
    userId: temporaryUserId,
    uploadSessionId: uploadSessionId,
    mode: "MULTIPART",
  });

  if (!session) {
    throw new UploadError("SESSION_NOT_FOUND");
  }

  if (session.status !== "UPLOADING") {
    throw new UploadError("INVALID_SESSION_STATUS");
  }

  if (session.expiresAt <= new Date()) {
    throw new UploadError("SESSION_EXPIRED");
  }

  if (!session.storageUploadId) {
    throw new UploadError("INVALID_SESSION");
  }

  if (
    !Number.isInteger(partNumber) ||
    partNumber < 1 ||
    partNumber > session.expectedParts
  ) {
    throw new UploadError("INVALID_PART_NUMBER");
  }

  const result = await storage.createMultipartPartUploadUrl(
    session.objectKey,
    session.storageUploadId,
    partNumber,
  );

  const expiresAt = new Date(
    Date.now() + PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS * 1000,
  );

  return {
    expiresAt: expiresAt.toISOString(),
    method: "PUT",
    partNumber,
    uploadUrl: result,
  };
}

export async function completeMultipartUpload(
  uploadSessionId: string,
  input: CompleteMultipartUploadInput,
): Promise<CompleteMultipartUploadResult> {
  const session = await fileRepository.findUploadSession({
    userId: temporaryUserId,
    uploadSessionId,
    mode: "MULTIPART",
  });

  if (!session) {
    throw new UploadError("SESSION_NOT_FOUND");
  }

  if (session.status === "COMPLETED") {
    return {
      fileId: session.fileId,
      status: "COMPLETED",
      uploadSessionId: session.uploadSessionId,
    };
  }

  if (session.status !== "UPLOADING" && session.status !== "COMPLETING") {
    throw new UploadError("INVALID_SESSION_STATUS");
  }

  if (session.status === "UPLOADING" && session.expiresAt <= new Date()) {
    throw new UploadError("SESSION_EXPIRED");
  }

  if (!session.storageUploadId) {
    throw new UploadError("INVALID_SESSION");
  }

  if (input.parts.length !== session.expectedParts) {
    throw new UploadError("MISSING_PARTS");
  }

  const partNumbers = new Set<number>();

  for (const part of input.parts) {
    if (part.partNumber > session.expectedParts) {
      throw new UploadError("INVALID_PART_NUMBER");
    }

    if (partNumbers.has(part.partNumber)) {
      throw new UploadError("DUPLICATE_PART");
    }

    partNumbers.add(part.partNumber);
  }

  const parts = [...input.parts].sort((a, b) => a.partNumber - b.partNumber);

  const claim = await resolveUploadCompletionClaim({
    mode: "MULTIPART",
    session,
    userId: temporaryUserId,
  });

  if (claim.outcome === "NOT_FOUND") {
    throw new UploadError("SESSION_NOT_FOUND");
  }

  if (claim.outcome === "INVALID_STATE") {
    throw new UploadError("INVALID_SESSION_STATUS");
  }

  if (claim.outcome === "COMPLETED") {
    return {
      fileId: claim.session.fileId,
      status: "COMPLETED",
      uploadSessionId: claim.session.uploadSessionId,
    };
  }

  const completionSession = claim.session;
  const ownsStorageCompletion = claim.outcome === "CLAIMED";

  if (!completionSession.storageUploadId) {
    throw new UploadError("INVALID_SESSION");
  }

  if (ownsStorageCompletion) {
    try {
      await storage.completeMultipartUpload(
        completionSession.objectKey,
        completionSession.storageUploadId,
        parts,
      );
    } catch (error) {
      let object;
      try {
        object = await getObjectMetadata(completionSession.objectKey);
      } catch {
        throw error;
      }

      if (!object) {
        await fileRepository.releaseUploadSessionCompletion(
          completionSession,
          "MULTIPART",
        );
        throw error;
      }
    }
  }

  const object = await getObjectMetadata(completionSession.objectKey);
  if (!object || object.size !== completionSession.totalSizeBytes) {
    throw new UploadError("VERIFICATION_FAILED");
  }

  const completed = await fileRepository.completeUploadSession(
    completionSession,
    "MULTIPART",
  );

  if (!completed) {
    const latestSession = await fileRepository.findUploadSession({
      userId: temporaryUserId,
      uploadSessionId,
      mode: "MULTIPART",
    });

    if (latestSession?.status !== "COMPLETED") {
      throw new UploadError("INVALID_SESSION_STATUS");
    }
  }

  return {
    status: "COMPLETED",
    fileId: completionSession.fileId,
    uploadSessionId: completionSession.uploadSessionId,
  };
}

export async function abortMultipartUpload(
  uploadSessionId: string,
): Promise<void> {
  const session = await fileRepository.findUploadSession({
    userId: temporaryUserId,
    uploadSessionId,
    mode: "MULTIPART",
  });

  if (!session) {
    throw new UploadError("SESSION_NOT_FOUND");
  }

  if (session.status !== "UPLOADING") {
    throw new UploadError("INVALID_SESSION_STATUS");
  }

  if (!session.storageUploadId) {
    throw new UploadError("INVALID_SESSION");
  }

  await storage.abortMultipartUpload(
    session.objectKey,
    session.storageUploadId,
  );

  await fileRepository.abortUploadSession(session);
}
