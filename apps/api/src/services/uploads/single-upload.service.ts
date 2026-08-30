import { fileRepository } from "../../repositories/file.repository";
import {
  getObjectMetadata,
  PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS,
  putUrl,
} from "../../s3";
import { SINGLE_UPLOAD_LIMIT_BYTES } from "./upload.constants";
import type {
  CompleteSingleUploadInput,
  CompleteSingleUploadResult,
  SingleUploadInput,
  SingleUploadResult,
} from "./single-upload.types";
import { resolveUploadCompletionClaim } from "./upload-completion";
import { UploadError } from "./upload.errors";

// TODO: Replace this with the authenticated user's ID once auth is introduced.
const temporaryUserId = "9e9a548c-dced-4f30-958d-19d423b53028";

export async function initiateSingleUpload(
  input: SingleUploadInput,
): Promise<SingleUploadResult> {
  if (input.size > SINGLE_UPLOAD_LIMIT_BYTES) {
    throw new UploadError("SINGLE_TOO_LARGE");
  }

  const expiresAt = new Date(
    Date.now() + PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS * 1000,
  );

  const session = await fileRepository.createUploadSession({
    ...input,
    expiresAt,
    userId: temporaryUserId,
    mode: "SINGLE",
    expectedParts: 1,
    partSizeBytes: input.size,
  });

  try {
    return {
      expiresAt: session.expiresAt.toISOString(),
      fileId: session.fileId,
      headers: { "content-type": input.type },
      method: "PUT",
      mode: "SINGLE",
      uploadSessionId: session.uploadSessionId,
      uploadUrl: await putUrl(session.objectKey, input.type),
    };
  } catch (error) {
    const persistedSession = await fileRepository.findUploadSession({
      mode: "SINGLE",
      uploadSessionId: session.uploadSessionId,
      userId: temporaryUserId,
    });

    if (persistedSession) {
      await fileRepository.failUploadSession(persistedSession);
    }

    throw error;
  }
}

export async function completeSingleUpload(
  fileId: string,
  input: CompleteSingleUploadInput,
): Promise<CompleteSingleUploadResult> {
  let session = await fileRepository.findUploadSession({
    userId: temporaryUserId,
    uploadSessionId: input.uploadSessionId,
    mode: "SINGLE",
  });

  if (!session) return { status: "NOT_FOUND" };

  if (session.status === "COMPLETED") {
    return {
      fileId,
      status: "COMPLETED",
      uploadSessionId: session.uploadSessionId,
    };
  }

  if (session.status !== "UPLOADING" && session.status !== "COMPLETING") {
    return { status: "NOT_FOUND" };
  }

  if (
    session.status === "UPLOADING" &&
    session.expiresAt.getTime() <= Date.now()
  ) {
    await fileRepository.failUploadSession(session);
    return { status: "EXPIRED" };
  }

  const object = await getObjectMetadata(session.objectKey);
  if (!object) return { status: "NOT_UPLOADED" };

  if (object.size !== session.totalSizeBytes) {
    await fileRepository.failUploadSession(session);
    return { status: "SIZE_MISMATCH" };
  }

  const claim = await resolveUploadCompletionClaim({
    mode: "SINGLE",
    session,
    userId: temporaryUserId,
  });

  if (claim.outcome === "COMPLETED") {
    return {
      fileId,
      status: "COMPLETED",
      uploadSessionId: claim.session.uploadSessionId,
    };
  }

  if (claim.outcome === "INVALID_STATE" || claim.outcome === "NOT_FOUND") {
    return { status: "NOT_FOUND" };
  }

  session = claim.session;

  const completed = await fileRepository.completeUploadSession(
    session,
    "SINGLE",
  );

  if (!completed) {
    const latestSession = await fileRepository.findUploadSession({
      userId: temporaryUserId,
      uploadSessionId: input.uploadSessionId,
      mode: "SINGLE",
    });

    if (latestSession?.status !== "COMPLETED") {
      return { status: "NOT_FOUND" };
    }
  }

  return {
    fileId,
    status: "COMPLETED",
    uploadSessionId: session.uploadSessionId,
  };
}
