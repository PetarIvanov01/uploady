import {
  abortUploadMulti,
  completeUploadMulti,
  initUploadMulti,
  uploadPartToDB,
  uploadPartToS3,
} from "../../../lib/upload/multi";
import type { UploadFileOptions } from "./shared";

export async function multipartUpload({
  body,
  name,
  onPhase,
  onProgress,
}: UploadFileOptions): Promise<void> {
  const contentType = body.type || "application/octet-stream";
  const size = body.size;

  onPhase("initializing");

  const { expiresAt, uploadSessionId, partSizeBytes } = await initUploadMulti({
    name: name,
    size,
    type: contentType,
  });

  let partNumber = 1;
  let uploadedBytes = 0;
  const parts: { partNumber: number; etag: string }[] = [];

  onProgress(uploadedBytes, expiresAt);

  try {
    for (let i = 0; i < size; i += partSizeBytes) {
      const chunk = body.slice(i, Math.min(i + partSizeBytes, size));

      const response = await uploadPartToDB({
        partNumber,
        uploadSessionId,
      });

      const etag = await uploadPartToS3(
        response.method,
        response.uploadUrl,
        chunk,
      );

      parts.push({ partNumber, etag });
      uploadedBytes += chunk.size;
      onProgress(uploadedBytes, expiresAt);
      partNumber++;
    }
  } catch (error) {
    try {
      await abortUploadMulti({ uploadSessionId });
    } catch {
      // Preserve the part failure; abort cleanup is best effort.
    }

    throw error;
  }

  onPhase("verifying");

  await completeUploadMulti({ uploadSessionId }, { parts });
}
