import { t, type UnwrapSchema } from "elysia";
import { fileRepository } from "../repositories/file.repository";

export const bodySchema = t.Object({
  name: t.String(),
  size: t.Numeric(),
  type: t.String(),
  lastModified: t.Numeric(),
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

export const uploadFile: UploadFileHandler = async ({
  name,
  size,
  type,
  lastModified,
}) => {
  const uploadedFile = await fileRepository.createSession({
    name,
    size,
    type,
    lastModified,
  });

  return {
    id: uploadedFile.id,
    name: uploadedFile.name,
    size: uploadedFile.size,
    type: uploadedFile.mimeType,
    lastModified: uploadedFile.lastModified,
    receivedSize: size,
  };
};
