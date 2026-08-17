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

const errorMessageSchema = t.Object({ message: t.String() });
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
      response: {
        201: t.Object({
          expiresAt: t.String(),
          fileId: t.String({ format: "uuid" }),
          headers: t.Object({ "content-type": t.String() }),
          method: t.Literal("PUT"),
          mode: t.Literal("SINGLE"),
          uploadSessionId: t.String({ format: "uuid" }),
          uploadUrl: t.String(),
        }),
        413: t.Object({
          maxSizeBytes: t.Integer(),
          message: t.String(),
        }),
      },
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
      response: {
        200: t.Object({
          fileId: t.String({ format: "uuid" }),
          status: t.Literal("COMPLETED"),
          uploadSessionId: t.String({ format: "uuid" }),
        }),
        404: errorMessageSchema,
        409: errorMessageSchema,
      },
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
      response: {
        201: t.Object({
          expectedParts: t.Integer(),
          expiresAt: t.String(),
          fileId: t.String({ format: "uuid" }),
          mode: t.Literal("MULTIPART"),
          partSizeBytes: t.Integer(),
          uploadSessionId: t.String({ format: "uuid" }),
        }),
        501: errorMessageSchema,
      },
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
      response: {
        200: t.Object({
          expiresAt: t.String(),
          method: t.Literal("PUT"),
          partNumber: t.Integer(),
          uploadUrl: t.String(),
        }),
        501: errorMessageSchema,
      },
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
      response: {
        200: t.Object({
          fileId: t.String({ format: "uuid" }),
          status: t.Literal("COMPLETED"),
          uploadSessionId: t.String({ format: "uuid" }),
        }),
        501: errorMessageSchema,
      },
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
      response: { 204: t.Void(), 501: errorMessageSchema },
    },
  );
