export interface MultipartUploadInput {
  checksum: string;
  name: string;
  size: number;
  type: string;
}

export interface MultipartPartParams {
  partNumber: number;
  uploadSessionId: string;
}

export interface CompleteMultipartUploadInput {
  parts: Array<{ etag: string; partNumber: number }>;
}

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
