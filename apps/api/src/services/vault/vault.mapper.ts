import type {
  VaultBreadcrumbRecord,
  VaultEntryRecord,
} from "../../repositories/vault-read.repository";
import { toIsoString } from "../../util";
import type { VaultBreadcrumb, VaultEntry } from "./vault.types";

export function toVaultBreadcrumbDto(
  folder: VaultBreadcrumbRecord,
): VaultBreadcrumb {
  return { id: folder.id, name: folder.name };
}

export function toVaultEntryDto(record: VaultEntryRecord): VaultEntry {
  if (record.kind === "folder") {
    return {
      counts: { files: record.fileCount, folders: record.folderCount },
      createdAt: toIsoString(record.createdAt),
      id: record.id,
      kind: "folder",
      name: record.name,
      updatedAt: toIsoString(record.updatedAt),
    };
  }

  return {
    createdAt: toIsoString(record.createdAt),
    id: record.id,
    kind: "file",
    name: record.name,
    size: record.size,
    status: record.status,
    type: record.type,
    updatedAt: toIsoString(record.updatedAt),
  };
}
