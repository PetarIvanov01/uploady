import { t } from "elysia";
import {
  MULTIPART_MAX_FILE_BYTES,
  MULTIPART_MAX_PARTS,
  SINGLE_UPLOAD_LIMIT_BYTES,
} from "../services/uploads/upload.constants";

export const singleUploadBodySchema = t.Object({
  checksum: t.String({ maxLength: 128, minLength: 1 }),
  name: t.String({ maxLength: 255, minLength: 1 }),
  size: t.Integer({ minimum: 1 }),
  type: t.String({ maxLength: 255, minLength: 1 }),
});

export const completeSingleUploadBodySchema = t.Object({
  uploadSessionId: t.String({ format: "uuid" }),
});

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
