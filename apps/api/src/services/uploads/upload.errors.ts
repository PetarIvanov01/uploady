import { SINGLE_UPLOAD_LIMIT_BYTES } from "./upload.constants";

export type UploadErrorCode =
  | "DUPLICATE_PART"
  | "INVALID_PART_NUMBER"
  | "INVALID_SESSION"
  | "INVALID_SESSION_STATUS"
  | "MISSING_PARTS"
  | "MULTIPART_TOO_SMALL"
  | "SESSION_EXPIRED"
  | "SESSION_NOT_FOUND"
  | "SINGLE_TOO_LARGE"
  | "VERIFICATION_FAILED";

const uploadErrorMessages = {
  DUPLICATE_PART: "Multipart upload contains duplicate part numbers",
  INVALID_PART_NUMBER: "Multipart upload contains an invalid part number",
  INVALID_SESSION: "Upload session is invalid",
  INVALID_SESSION_STATUS: "Upload session is not in a valid state",
  MISSING_PARTS: "Multipart upload is missing one or more expected parts",
  MULTIPART_TOO_SMALL: `Multipart uploads must exceed ${SINGLE_UPLOAD_LIMIT_BYTES} bytes`,
  SESSION_EXPIRED: "Upload session has expired",
  SESSION_NOT_FOUND: "Upload session not found",
  SINGLE_TOO_LARGE: `Single uploads cannot exceed ${SINGLE_UPLOAD_LIMIT_BYTES} bytes`,
  VERIFICATION_FAILED:
    "Completed multipart object does not match the declared upload",
} satisfies Record<UploadErrorCode, string>;

export class UploadError extends Error {
  readonly code: UploadErrorCode;

  constructor(code: UploadErrorCode) {
    super(uploadErrorMessages[code]);
    this.name = "UploadError";
    this.code = code;
  }
}
