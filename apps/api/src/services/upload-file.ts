import { t, type UnwrapSchema } from "elysia";
import { fileRepository } from "../repositories/file.repository";
import { PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS, putUrl } from "../s3";

export const SINGLE_UPLOAD_LIMIT_BYTES = 200 * 1024 * 1024;

export const singleUploadBodySchema = t.Object({
  checksum: t.String({ maxLength: 128, minLength: 1 }),
  name: t.String({ maxLength: 255, minLength: 1 }),
  size: t.Integer({ minimum: 1 }),
  type: t.String({ maxLength: 255, minLength: 1 }),
});

export type SingleUploadInput = UnwrapSchema<typeof singleUploadBodySchema>;

export interface SingleUploadResult {
  expiresAt: string;
  fileId: string;
  headers: { "content-type": string };
  method: "PUT";
  mode: "SINGLE";
  uploadSessionId: string;
  uploadUrl: string;
}

export class SingleUploadTooLargeError extends Error {
  constructor() {
    super(`Single uploads cannot exceed ${SINGLE_UPLOAD_LIMIT_BYTES} bytes`);
    this.name = "SingleUploadTooLargeError";
  }
}

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
