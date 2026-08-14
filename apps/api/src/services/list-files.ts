import { fileRepository } from "../repositories/file.repository";
import { toFileMetadata, type RetrieveFileResult } from "./retrieve-file";

export async function listFiles(): Promise<RetrieveFileResult[]> {
  const files = await fileRepository.findAll();

  return files.map(toFileMetadata);
}
