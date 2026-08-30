import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "./env";
import type { CompleteMultipartParts } from "./services/uploads/multipart-upload.types";

const endpoint = env.S3_ENDPOINT_URL;
const publicEndpoint = env.S3_PUBLIC_ENDPOINT_URL;
const accessKeyId = env.S3_ACCESS_KEY_ID;
const secretAccessKey = env.S3_SECRET_ACCESS_KEY;
const bucketName = env.S3_BUCKET_NAME;
const forcePathStyle = env.S3_FORCE_PATH_STYLE;

const createS3Client = (clientEndpoint: string) =>
  new S3Client({
    endpoint: clientEndpoint,
    region: "auto",
    forcePathStyle,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

export const PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS = 5 * 60;

export const s3 = createS3Client(endpoint);

const presigningS3 = publicEndpoint ? createS3Client(publicEndpoint) : s3;

/** @knipignore Reserved for the file-download endpoint. */
export const getUrl = async (objectKey: string) =>
  getSignedUrl(
    presigningS3,
    new GetObjectCommand({ Bucket: bucketName, Key: objectKey }),
    { expiresIn: 60 * 60 },
  );

export const putUrl = async (objectKey: string, contentType: string) =>
  getSignedUrl(
    presigningS3,
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

export async function createMultipartUpload(
  objectKey: string,
): Promise<{ uploadId: string }> {
  const command = new CreateMultipartUploadCommand({
    Bucket: bucketName,
    Key: objectKey,
  });

  const upload = await s3.send(command);

  if (!upload.UploadId) {
    throw new Error("Storage provider did not return an upload ID");
  }

  return {
    uploadId: upload.UploadId,
  };
}

const createMultipartPartUploadUrl = async (
  objectKey: string,
  uploadId: string,
  partNumber: number,
) =>
  getSignedUrl(
    presigningS3,
    new UploadPartCommand({
      Bucket: bucketName,
      Key: objectKey,
      UploadId: uploadId,
      PartNumber: partNumber,
    }),
    { expiresIn: PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS },
  );

const completeMultipartUpload = async (
  objectKey: string,
  storageUploadId: string,
  parts: CompleteMultipartParts,
): Promise<void> => {
  const command = new CompleteMultipartUploadCommand({
    Bucket: bucketName,
    Key: objectKey,
    UploadId: storageUploadId,
    MultipartUpload: {
      Parts: parts.map((e) => ({ PartNumber: e.partNumber, ETag: e.etag })),
    },
  });

  await s3.send(command);
};

const abortMultipartUpload = async (
  objectKey: string,
  storageUploadId: string,
): Promise<void> => {
  const command = new AbortMultipartUploadCommand({
    Bucket: bucketName,
    Key: objectKey,
    UploadId: storageUploadId,
  });

  await s3.send(command);
};

export const storage = {
  createMultipartUpload,
  createMultipartPartUploadUrl,
  completeMultipartUpload,
  abortMultipartUpload,
};
