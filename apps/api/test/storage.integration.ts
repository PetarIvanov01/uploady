import { afterAll, describe, expect, it, spyOn } from "bun:test";
import {
  CompleteMultipartUploadCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getObjectMetadata, putUrl, s3, storage } from "../src/s3";

const bucketName = process.env.S3_BUCKET_NAME?.trim();
const corsAllowedOrigin = process.env.S3_CORS_ALLOWED_ORIGIN?.trim();

if (!bucketName || !corsAllowedOrigin) {
  throw new Error(
    "S3_BUCKET_NAME and S3_CORS_ALLOWED_ORIGIN are required for storage integration tests",
  );
}

const createdKeys = new Set<string>();

afterAll(async () => {
  await Promise.all(
    [...createdKeys].map((Key) =>
      s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key })),
    ),
  );
});

describe("S3-compatible storage contract", () => {
  it("uploads through a presigned URL and reads metadata through the API client", async () => {
    const key = `integration/${crypto.randomUUID()}`;
    const contentType = "text/plain";
    const body = `uploady-storage-contract-${crypto.randomUUID()}`;
    createdKeys.add(key);

    const uploadUrl = await putUrl(key, contentType);
    const parsedUploadUrl = new URL(uploadUrl);

    expect(parsedUploadUrl.pathname).toStartWith(`/${bucketName}/`);

    const preflightResponse = await fetch(uploadUrl, {
      method: "OPTIONS",
      headers: {
        origin: corsAllowedOrigin,
        "access-control-request-headers": "content-type",
        "access-control-request-method": "PUT",
      },
    });

    expect(preflightResponse.status).toBe(200);
    expect(preflightResponse.headers.get("access-control-allow-origin")).toBe(
      corsAllowedOrigin,
    );
    expect(
      preflightResponse.headers.get("access-control-allow-methods"),
    ).toContain("PUT");

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "content-type": contentType },
      body,
    });

    expect(uploadResponse.status).toBe(200);
    expect(await getObjectMetadata(key)).toEqual({
      contentType,
      etag: expect.any(String),
      size: Buffer.byteLength(body),
    });
  });

  it("returns null when an object does not exist", async () => {
    expect(
      await getObjectMetadata(`integration/missing-${crypto.randomUUID()}`),
    ).toBeNull();
  });

  it("completes a multipart upload with the ETags returned for its parts", async () => {
    const key = `integration/multipart-${crypto.randomUUID()}`;
    const firstPart = new Uint8Array(5 * 1024 * 1024);
    const secondPart = new TextEncoder().encode("final-part");
    createdKeys.add(key);

    const { uploadId } = await storage.createMultipartUpload(key);
    let completed = false;

    try {
      const parts = await Promise.all(
        [firstPart, secondPart].map(async (body, index) => {
          const partNumber = index + 1;
          const uploadUrl = await storage.createMultipartPartUploadUrl(
            key,
            uploadId,
            partNumber,
          );
          const response = await fetch(uploadUrl, { body, method: "PUT" });

          expect(response.status).toBe(200);

          const etag = response.headers.get("etag");
          expect(etag).not.toBeNull();

          return { etag: etag!, partNumber };
        }),
      );

      await storage.completeMultipartUpload(key, uploadId, parts);
      completed = true;

      expect(await getObjectMetadata(key)).toMatchObject({
        size: firstPart.byteLength + secondPart.byteLength,
      });
    } finally {
      if (!completed) {
        await storage
          .abortMultipartUpload(key, uploadId)
          .catch(() => undefined);
      }
    }
  });

  it("sends each completed part ETag with the AWS SDK field name", async () => {
    const sendSpy = spyOn(s3, "send").mockImplementation(
      async () => ({}) as never,
    );

    try {
      await storage.completeMultipartUpload("object-key", "storage-upload-id", [
        { etag: '"part-etag"', partNumber: 1 },
      ]);

      const command = sendSpy.mock.calls[0]?.[0];
      expect(command).toBeInstanceOf(CompleteMultipartUploadCommand);
      expect(
        (command as CompleteMultipartUploadCommand).input.MultipartUpload,
      ).toEqual({
        Parts: [{ ETag: '"part-etag"', PartNumber: 1 }],
      });
    } finally {
      sendSpy.mockRestore();
    }
  });
});
