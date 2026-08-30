import {
  UploadError,
  type UploadErrorCode,
} from "../services/uploads/upload.errors";

const uploadErrorStatus = {
  DUPLICATE_PART: 409,
  INVALID_PART_NUMBER: 409,
  INVALID_SESSION: 409,
  INVALID_SESSION_STATUS: 409,
  MISSING_PARTS: 409,
  MULTIPART_TOO_SMALL: 413,
  SESSION_EXPIRED: 409,
  SESSION_NOT_FOUND: 404,
  SINGLE_TOO_LARGE: 413,
  VERIFICATION_FAILED: 409,
} as const satisfies Record<UploadErrorCode, 404 | 409 | 413>;

interface UploadErrorResponse {
  body: { message: string };
  status: 404 | 409 | 413;
}

export function toUploadErrorResponse(
  error: unknown,
): UploadErrorResponse | null {
  console.error("Error: ", error);

  if (!(error instanceof UploadError)) return null;

  return {
    body: { message: error.message },
    status: uploadErrorStatus[error.code],
  };
}
