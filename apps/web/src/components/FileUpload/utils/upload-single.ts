import {
  completeUploadSingle,
  initUploadSingle,
} from "../../../lib/upload/single";
import { waitForMinimumDuration, type UploadFileOptions } from "./shared";
import { uploadToStorage } from "./upload-blob";

export async function uploadSingleFile({
  name,
  body: file,
  onPhase,
  onProgress,
  preservePhaseDuration,
}: UploadFileOptions) {
  const preparingStartedAt = performance.now();

  onPhase("preparing");

  if (preservePhaseDuration) {
    await waitForMinimumDuration(preparingStartedAt);
  }

  const contentType = file.type || "application/octet-stream";

  const initializingStartedAt = performance.now();

  onPhase("initializing");

  const session = await initUploadSingle({
    name: name,
    size: file.size,
    type: contentType,
  });

  if (preservePhaseDuration) {
    await waitForMinimumDuration(initializingStartedAt);
  }

  const uploadingStartedAt = performance.now();

  onProgress(0, session.expiresAt);

  await uploadToStorage({
    body: file,
    headers: session.headers,
    method: session.method,
    url: session.uploadUrl,
    onProgress: (loaded) => {
      onProgress(loaded, session.expiresAt);
    },
  });

  if (preservePhaseDuration) {
    await waitForMinimumDuration(uploadingStartedAt);
  }

  const verifyingStartedAt = performance.now();

  onPhase("verifying");

  await completeUploadSingle(
    { fileId: session.fileId },
    {
      uploadSessionId: session.uploadSessionId,
    },
  );

  if (preservePhaseDuration) {
    await waitForMinimumDuration(verifyingStartedAt);
  }
}
