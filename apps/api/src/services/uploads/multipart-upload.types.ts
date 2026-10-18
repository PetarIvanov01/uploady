export interface MultipartUploadInput {
  name: string;
  size: number;
  type: string;
  checksum?: string;
}

export interface MultipartPartParams {
  partNumber: number;
  uploadSessionId: string;
}

export interface CompleteMultipartUploadInput {
  parts: Array<{ etag: string; partNumber: number }>;
}

export type CompleteMultipartParts = CompleteMultipartUploadInput["parts"];

export interface MultipartUploadInitResult {
  expiresAt: string;
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
