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

// TODO: Replace this with the authenticated user's ID once auth is introduced.
const temporaryUserId = "9e9a548c-dced-4f30-958d-19d423b53028";

export async function initiateSingleUpload(
  input: SingleUploadInput,
): Promise<SingleUploadResult> {
  if (input.size > SINGLE_UPLOAD_LIMIT_BYTES) {
    throw new SingleUploadTooLargeError();
  }

  const expiresAt = new Date(
    Date.now() + PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS * 1000,
  );
  const session = await fileRepository.createSingleUploadSession({
    ...input,
    expiresAt,
    userId: temporaryUserId,
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
    const persistedSession = await fileRepository.findSingleUploadSession(
      session.fileId,
      session.uploadSessionId,
    );

    if (persistedSession) {
      await fileRepository.failSingleUploadSession(persistedSession);
    }

    throw error;
  }
}

export async function completeSingleUpload(
  fileId: string,
  input: CompleteSingleUploadInput,
): Promise<CompleteSingleUploadResult> {
  const session = await fileRepository.findSingleUploadSession(
    fileId,
    input.uploadSessionId,
  );

  if (!session) return { status: "NOT_FOUND" };

  if (session.status === "COMPLETED") {
    return {
      fileId,
      status: "COMPLETED",
      uploadSessionId: session.uploadSessionId,
    };
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await fileRepository.failSingleUploadSession(session);
    return { status: "EXPIRED" };
  }

  const object = await getObjectMetadata(session.objectKey);
  if (!object) return { status: "NOT_UPLOADED" };

  if (object.size !== session.totalSizeBytes) {
    await fileRepository.failSingleUploadSession(session);
    return { status: "SIZE_MISMATCH" };
  }

  const completed = await fileRepository.completeSingleUploadSession(session);

  if (!completed) {
    const latestSession = await fileRepository.findSingleUploadSession(
      fileId,
      input.uploadSessionId,
    );

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

export class SingleUploadTooLargeError extends Error {
  constructor() {
    super(`Single uploads cannot exceed ${SINGLE_UPLOAD_LIMIT_BYTES} bytes`);
    this.name = "SingleUploadTooLargeError";
  }
}
