import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const requiredEnvironmentVariables = [
  "S3_ENDPOINT_URL",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_BUCKET_NAME",
  "S3_CORS_ALLOWED_ORIGIN",
];

const environment = Object.fromEntries(
  requiredEnvironmentVariables.map((name) => [name, process.env[name]?.trim()]),
);

const missingVariables = requiredEnvironmentVariables.filter(
  (name) => !environment[name],
);

if (missingVariables.length > 0) {
  throw new Error(
    `Missing required object-storage initializer variables: ${missingVariables.join(", ")}`,
  );
}

const client = new S3Client({
  endpoint: environment.S3_ENDPOINT_URL,
  region: "auto",
  forcePathStyle: true,
  credentials: {
    accessKeyId: environment.S3_ACCESS_KEY_ID,
    secretAccessKey: environment.S3_SECRET_ACCESS_KEY,
  },
});

const bucketName = environment.S3_BUCKET_NAME;

try {
  await client.send(new HeadBucketCommand({ Bucket: bucketName }));
  console.log(`Object-storage bucket already exists: ${bucketName}`);
} catch (error) {
  if (error?.$metadata?.httpStatusCode !== 404) throw error;

  await client.send(new CreateBucketCommand({ Bucket: bucketName }));
  console.log(`Created object-storage bucket: ${bucketName}`);
}

await client.send(
  new PutBucketCorsCommand({
    Bucket: bucketName,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ["content-type"],
          AllowedMethods: ["GET", "HEAD", "PUT"],
          AllowedOrigins: [environment.S3_CORS_ALLOWED_ORIGIN],
          ExposeHeaders: ["etag"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);

console.log(
  `Configured ${bucketName} CORS for ${environment.S3_CORS_ALLOWED_ORIGIN}`,
);
