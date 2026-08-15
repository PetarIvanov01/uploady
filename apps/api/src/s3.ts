import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = process.env.S3_ENDPOINT_URL?.trim();
const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
const bucketName = process.env.S3_BUCKET_NAME?.trim();

if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
  const missingVariables = [
    ["S3_ENDPOINT_URL", endpoint],
    ["S3_ACCESS_KEY_ID", accessKeyId],
    ["S3_SECRET_ACCESS_KEY", secretAccessKey],
    ["S3_BUCKET_NAME", bucketName],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  throw new Error(
    `Missing required S3 environment variables: ${missingVariables.join(", ")}`,
  );
}

export const PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS = 5 * 60;

export const s3 = new S3Client({
  endpoint,
  region: "auto",
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export const getUrl = async (objectKey: string) =>
  getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: bucketName, Key: objectKey }),
    { expiresIn: 60 * 60 },
  );

export const putUrl = async (objectKey: string, contentType: string) =>
  getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      ContentType: contentType,
    }),
    { expiresIn: PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS },
  );

export interface ObjectMetadata {
  contentType: string | null;
  etag: string | null;
  size: number;
}

export async function getObjectMetadata(
  objectKey: string,
): Promise<ObjectMetadata | null> {
  try {
    const object = await s3.send(
      new HeadObjectCommand({ Bucket: bucketName, Key: objectKey }),
    );

    return {
      contentType: object.ContentType ?? null,
      etag: object.ETag ?? null,
      size: object.ContentLength ?? 0,
    };
  } catch (error) {
    if (
      error instanceof S3ServiceException &&
      error.$metadata.httpStatusCode === 404
    ) {
      return null;
    }

    throw error;
  }
}
