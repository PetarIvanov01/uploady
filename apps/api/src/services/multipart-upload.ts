import { t, type UnwrapSchema } from "elysia";
import { SINGLE_UPLOAD_LIMIT_BYTES } from "./upload-file";

/** @knipignore Reserved for multipart implementation. */
export const MULTIPART_MIN_PART_BYTES = 5 * 1024 * 1024; // 5 MB;
/** @knipignore Reserved for multipart implementation. */
export const MULTIPART_DEFAULT_PART_BYTES = 100 * 1024 * 1024; // 100 MB;
/** @knipignore Reserved for multipart implementation. */
export const MULTIPART_MAX_PART_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB;
export const MULTIPART_MAX_PARTS = 10_000;
export const MULTIPART_MAX_FILE_BYTES =
  5 * 1024 * 1024 * 1024 * 1024 - 5 * 1024 * 1024 * 1024; // roughly 4.995 TiB;

export const multipartUploadBodySchema = t.Object({
  checksum: t.String({ maxLength: 128, minLength: 1 }),
  name: t.String({ maxLength: 255, minLength: 1 }),
  size: t.Integer({
    maximum: MULTIPART_MAX_FILE_BYTES,
    minimum: SINGLE_UPLOAD_LIMIT_BYTES + 1,
  }),
  type: t.String({ maxLength: 255, minLength: 1 }),
});

export const multipartPartParamsSchema = t.Object({
  partNumber: t.Integer({ maximum: MULTIPART_MAX_PARTS, minimum: 1 }),
  uploadSessionId: t.String({ format: "uuid" }),
});

export const completeMultipartUploadBodySchema = t.Object({
  parts: t.Array(
    t.Object({
      etag: t.String({ minLength: 1 }),
      partNumber: t.Integer({ maximum: MULTIPART_MAX_PARTS, minimum: 1 }),
    }),
    { maxItems: MULTIPART_MAX_PARTS, minItems: 1 },
  ),
});

export type MultipartUploadInput = UnwrapSchema<
  typeof multipartUploadBodySchema
>;
export type MultipartPartParams = UnwrapSchema<
  typeof multipartPartParamsSchema
>;
export type CompleteMultipartUploadInput = UnwrapSchema<
  typeof completeMultipartUploadBodySchema
>;

export interface MultipartUploadResult {
  expectedParts: number;
  expiresAt: string;
  fileId: string;
  mode: "MULTIPART";
  partSizeBytes: number;
  uploadSessionId: string;
}

export interface MultipartPartUploadUrlResult {
  expiresAt: string;
  method: "PUT";
  partNumber: number;
  uploadUrl: string;
}

export interface CompleteMultipartUploadResult {
  fileId: string;
  status: "COMPLETED";
  uploadSessionId: string;
}

export class MultipartUploadNotImplementedError extends Error {
  constructor() {
    super("Multipart uploads are not implemented yet");
    this.name = "MultipartUploadNotImplementedError";
  }
}

export async function initiateMultipartUpload(
  _input: MultipartUploadInput,
): Promise<MultipartUploadResult> {
  throw new MultipartUploadNotImplementedError();
}

export async function createMultipartPartUploadUrl(
  _params: MultipartPartParams,
): Promise<MultipartPartUploadUrlResult> {
  throw new MultipartUploadNotImplementedError();
}

export async function completeMultipartUpload(
  _uploadSessionId: string,
  _input: CompleteMultipartUploadInput,
): Promise<CompleteMultipartUploadResult> {
  throw new MultipartUploadNotImplementedError();
}

export async function abortMultipartUpload(
  _uploadSessionId: string,
): Promise<void> {
  throw new MultipartUploadNotImplementedError();
}
