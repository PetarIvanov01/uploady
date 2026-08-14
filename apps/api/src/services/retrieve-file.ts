import {
  fileRepository,
  type FileRecord,
} from "../repositories/file.repository";

export interface RetrieveFileResult {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  createdAt: string;
}

export function toFileMetadata(file: FileRecord): RetrieveFileResult {
  return {
    id: file.id,
    name: file.name,
    size: file.size,
    type: file.mimeType,
    lastModified: file.lastModified,
    createdAt: file.createdAt.toISOString(),
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
