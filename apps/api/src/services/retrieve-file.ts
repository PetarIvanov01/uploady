import type {
  FileRecord,
  FileRepository,
} from "../repositories/file.repository";

export interface RetrieveFileResult {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  createdAt: string;
}

export type RetrieveFileHandler = (
  id: string,
) => Promise<RetrieveFileResult | null>;

interface RetrieveFileDependencies {
  fileRepository: Pick<FileRepository, "findById">;
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

export function initRetrieveFile({
  fileRepository,
}: RetrieveFileDependencies): RetrieveFileHandler {
  return async (id) => {
    const file = await fileRepository.findById(id);

    if (!file) {
      return null;
    }

    return toFileMetadata(file);
  };
}
