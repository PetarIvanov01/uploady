import type { FolderRecord } from "../../repositories/folder.repository";
import { toIsoString } from "../../util";
import type { FolderResult } from "./folders.types";

export function toFolderDto(folder: FolderRecord): FolderResult {
  return {
    createdAt: toIsoString(folder.createdAt),
    id: folder.id,
    name: folder.name,
    parentFolderId: folder.parentFolderId,
    updatedAt: toIsoString(folder.updatedAt),
  };
}
