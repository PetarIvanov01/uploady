import {
  fileRepository,
  type FileRecord,
} from "../repositories/file.repository";

export interface RetrieveFileResult {
  createdAt: string;
  id: string;
  name: string;
  size: number;
  status: FileRecord["status"];
  type: string;
}

export function toFileMetadata(file: FileRecord): RetrieveFileResult {
  return {
    createdAt: file.createdAt.toISOString(),
    id: file.id,
    name: file.name,
    size: file.size,
    status: file.status,
    type: file.mimeType,
  };
}

export async function retrieveFile(
  id: string,
): Promise<RetrieveFileResult | null> {
  const file = await fileRepository.findById(id);

  if (!file) {
    return null;
  }

  return toFileMetadata(file);
}
