import { t, type UnwrapSchema } from "elysia";
import type { FileRepository } from "../repositories/file.repository";

export const bodySchema = t.Object({
  name: t.String(),
  size: t.Numeric(),
  type: t.String(),
  lastModified: t.Numeric(),
  file: t.File(),
});

export type UploadFileInput = UnwrapSchema<typeof bodySchema>;

export interface UploadFileResult {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  receivedSize: number;
}

export type UploadFileHandler = (
  input: UploadFileInput,
) => Promise<UploadFileResult>;

interface UploadFileDependencies {
  fileRepository: Pick<FileRepository, "create">;
}

export function initUploadFile({
  fileRepository,
}: UploadFileDependencies): UploadFileHandler {
  return async ({ name, size, type, lastModified, file }) => {
    const uploadedFile = await fileRepository.create({
      name,
      size,
      mimeType: type,
      lastModified,
    });

    return {
      id: uploadedFile.id,
      name: uploadedFile.name,
      size: uploadedFile.size,
      type: uploadedFile.mimeType,
      lastModified: uploadedFile.lastModified,
      receivedSize: file.size,
    };
  };
}
