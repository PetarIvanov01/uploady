import type { FileRepository } from "../repositories/file.repository";
import { toFileMetadata, type RetrieveFileResult } from "./retrieve-file";

export type ListFilesHandler = () => Promise<RetrieveFileResult[]>;

interface ListFilesDependencies {
  fileRepository: Pick<FileRepository, "findAll">;
}

export function initListFiles({
  fileRepository,
}: ListFilesDependencies): ListFilesHandler {
  return async () => {
    const files = await fileRepository.findAll();

    return files.map(toFileMetadata);
  };
}
