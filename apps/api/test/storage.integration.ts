import { afterAll, describe, expect, it } from "bun:test";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getObjectMetadata, putUrl, s3 } from "../src/s3";

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
});
