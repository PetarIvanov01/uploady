export interface SingleUploadInput {
  checksum: string;
  name: string;
  size: number;
  type: string;
}

export interface SingleUploadResult {
  expiresAt: string;
  fileId: string;
  headers: { "content-type": string };
  method: "PUT";
  mode: "SINGLE";
  uploadSessionId: string;
  uploadUrl: string;
}

export interface CompleteSingleUploadInput {
  uploadSessionId: string;
}

export type CompleteSingleUploadResult =
  | {
      fileId: string;
      status: "COMPLETED";
      uploadSessionId: string;
    }
  | { status: "EXPIRED" | "NOT_FOUND" | "NOT_UPLOADED" | "SIZE_MISMATCH" };
