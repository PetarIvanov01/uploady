export type FileMetadata = {
  createdAt: string;
  id: string;
  itemCount?: number;
  name: string;
  size: number;
  status: "UPLOADING" | "READY" | "FAILED" | "DELETED";
  type: string;
  updatedAt?: string;
};

export function isFolder(item: FileMetadata) {
  const normalizedType = item.type.toLowerCase();

  return (
    normalizedType === "folder" ||
    normalizedType === "inode/directory" ||
    item.name.endsWith("/")
  );
}
