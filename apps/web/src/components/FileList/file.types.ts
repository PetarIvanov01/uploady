export type FileMetadata = {
  createdAt: string;
  id: string;
  name: string;
  size: number;
  status: "UPLOADING" | "READY" | "FAILED" | "DELETED";
  type: string;
  updatedAt?: string;
};
