import { Elysia, t } from "elysia";
import {
  completeSingleUploadBodySchema,
  completeSingleUpload,
} from "../services/complete-upload";
import {
  abortMultipartUpload,
  completeMultipartUpload,
  completeMultipartUploadBodySchema,
  createMultipartPartUploadUrl,
  initiateMultipartUpload,
  MultipartUploadNotImplementedError,
  multipartPartParamsSchema,
  multipartUploadBodySchema,
} from "../services/multipart-upload";
import {
  initiateSingleUpload,
  SINGLE_UPLOAD_LIMIT_BYTES,
  singleUploadBodySchema,
  SingleUploadTooLargeError,
} from "../services/upload-file";

const uploadIdParamsSchema = t.Object({
  uploadSessionId: t.String({ format: "uuid" }),
});

function multipartNotImplemented(error: unknown): { message: string } | null {
  return error instanceof MultipartUploadNotImplementedError
    ? { message: error.message }
    : null;
}

export const uploads = new Elysia({ prefix: "/uploads" })
  .post(
    "/single",
    async ({ body, status }) => {
      try {
        return status(201, await initiateSingleUpload(body));
      } catch (error) {
        if (error instanceof SingleUploadTooLargeError) {
          return status(413, {
            maxSizeBytes: SINGLE_UPLOAD_LIMIT_BYTES,
            message: error.message,
          });
        }

        throw error;
      }
    },
    {
      body: singleUploadBodySchema,
    },
  )
  .post(
    "/single/:fileId/complete",
    async ({ body, params, status }) => {
      const result = await completeSingleUpload(params.fileId, body);

      if (result.status === "NOT_FOUND") {
        return status(404, { message: "Upload session not found" });
      }

      if (result.status !== "COMPLETED") {
        const messages = {
          EXPIRED: "Upload session expired",
          NOT_UPLOADED: "The object has not been uploaded",
          SIZE_MISMATCH:
            "Uploaded object size does not match the declared size",
        } as const;

        return status(409, { message: messages[result.status] });
      }

      return result;
    },
    {
      body: completeSingleUploadBodySchema,
      params: t.Object({ fileId: t.String({ format: "uuid" }) }),
    },
  )
  .post(
    "/multipart",
    async ({ body, status }) => {
      try {
        return status(201, await initiateMultipartUpload(body));
      } catch (error) {
        const response = multipartNotImplemented(error);
        if (response) return status(501, response);
        throw error;
      }
    },
    {
      body: multipartUploadBodySchema,
    },
  )
  .post(
    "/multipart/:uploadSessionId/parts/:partNumber",
    async ({ params, status }) => {
      try {
        return await createMultipartPartUploadUrl(params);
      } catch (error) {
        const response = multipartNotImplemented(error);
        if (response) return status(501, response);
        throw error;
      }
    },
    {
      params: multipartPartParamsSchema,
    },
  )
  .post(
    "/multipart/:uploadSessionId/complete",
    async ({ body, params, status }) => {
      try {
        return await completeMultipartUpload(params.uploadSessionId, body);
      } catch (error) {
        const response = multipartNotImplemented(error);
        if (response) return status(501, response);
        throw error;
      }
    },
    {
      body: completeMultipartUploadBodySchema,
      params: uploadIdParamsSchema,
    },
  )
  .delete(
    "/multipart/:uploadSessionId",
    async ({ params, status }) => {
      try {
        await abortMultipartUpload(params.uploadSessionId);
        return status(204, undefined);
      } catch (error) {
        const response = multipartNotImplemented(error);
        if (response) return status(501, response);
        throw error;
      }
    },
    {
      params: uploadIdParamsSchema,
    },
  );
