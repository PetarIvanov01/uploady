import { t, type UnwrapSchema } from "elysia";
import { fileRepository } from "../repositories/file.repository";
import { getObjectMetadata } from "../s3";

export const completeSingleUploadBodySchema = t.Object({
  uploadSessionId: t.String({ format: "uuid" }),
});

export type CompleteSingleUploadInput = UnwrapSchema<
  typeof completeSingleUploadBodySchema
>;

export type CompleteSingleUploadResult =
  | {
      fileId: string;
      status: "COMPLETED";
      uploadSessionId: string;
    }
  | { status: "EXPIRED" | "NOT_FOUND" | "NOT_UPLOADED" | "SIZE_MISMATCH" };

export async function completeSingleUpload(
  fileId: string,
  input: CompleteSingleUploadInput,
): Promise<CompleteSingleUploadResult> {
  const session = await fileRepository.findSingleUploadSession(
    fileId,
    input.uploadSessionId,
  );

  if (!session) {
    return { status: "NOT_FOUND" };
  }

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

  if (!object) {
    return { status: "NOT_UPLOADED" };
  }

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
