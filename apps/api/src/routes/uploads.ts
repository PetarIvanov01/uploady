import { Elysia, t } from "elysia";
import {
  completeSingleUpload,
  initiateSingleUpload,
} from "../services/uploads/single-upload.service";
import {
  abortMultipartUpload,
  completeMultipartUpload,
  createMultipartPartUploadUrl,
  initiateMultipartUpload,
} from "../services/uploads/multipart-upload.service";
import {
  completeMultipartUploadBodySchema,
  completeSingleUploadBodySchema,
  multipartPartParamsSchema,
  multipartUploadBodySchema,
  singleUploadBodySchema,
} from "./uploads.schemas";
import { toUploadErrorResponse } from "./uploads.error-mapper";

const uploadIdParamsSchema = t.Object({
  uploadSessionId: t.String({ format: "uuid" }),
});

export const uploads = new Elysia({ prefix: "/uploads" })
  .post(
    "/single",
    async ({ body, status }) => {
      try {
        return status(201, await initiateSingleUpload(body));
      } catch (error) {
        const response = toUploadErrorResponse(error);
        if (response) return status(response.status, response.body);

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
        const response = toUploadErrorResponse(error);
        if (response) return status(response.status, response.body);
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
        const response = toUploadErrorResponse(error);
        if (response) return status(response.status, response.body);
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
        const response = toUploadErrorResponse(error);
        if (response) return status(response.status, response.body);
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
        const response = toUploadErrorResponse(error);
        if (response) return status(response.status, response.body);
        throw error;
      }
    },
    {
      params: uploadIdParamsSchema,
    },
  );
