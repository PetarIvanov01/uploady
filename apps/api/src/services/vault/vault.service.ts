import {
  vaultReadRepository,
  type VaultBreadcrumbRecord,
} from "../../repositories/vault-read.repository";
import { toIsoString } from "../../util";
import { toVaultBreadcrumbDto, toVaultEntryDto } from "./vault.mapper";
import type {
  FileVaultResult,
  FolderVaultResult,
  RootVaultResult,
} from "./vault.types";

// TODO: Replace this with the authenticated user's ID once auth is introduced.
const temporaryUserId = "9e9a548c-dced-4f30-958d-19d423b53028";

function assertValidPath(
  folderId: string,
  path: VaultBreadcrumbRecord[],
): asserts path is [VaultBreadcrumbRecord, ...VaultBreadcrumbRecord[]] {
  if (
    path.length === 0 ||
    path.at(-1)?.id !== folderId ||
    path[0].parentFolderId !== null
  ) {
    throw new InvalidFolderHierarchyError(folderId);
  }
}

export async function retrieveRootVault(): Promise<RootVaultResult> {
  const entries = await vaultReadRepository.findEntries(temporaryUserId, null);

  return {
    breadcrumbs: [],
    entries: entries.map(toVaultEntryDto),
    location: { kind: "root" },
  };
}

export async function retrieveFolderVault(
  folderId: string,
): Promise<FolderVaultResult | null> {
  const [path, entries] = await Promise.all([
    vaultReadRepository.findFolderPath(temporaryUserId, folderId),
    vaultReadRepository.findEntries(temporaryUserId, folderId),
  ]);

  if (path.length === 0) return null;
  assertValidPath(folderId, path);

  const currentFolder = path.at(-1)!;

  return {
    breadcrumbs: path.map(toVaultBreadcrumbDto),
    entries: entries.map(toVaultEntryDto),
    location: {
      createdAt: toIsoString(currentFolder.createdAt),
      id: currentFolder.id,
      kind: "folder",
      name: currentFolder.name,
      parentFolderId: currentFolder.parentFolderId,
      updatedAt: toIsoString(currentFolder.updatedAt),
    },
  };
}

export async function retrieveFileVault(
  fileId: string,
): Promise<FileVaultResult | null> {
  const file = await vaultReadRepository.findFile(temporaryUserId, fileId);
  if (!file) return null;

  const path = file.parentFolderId
    ? await vaultReadRepository.findFolderPath(
        temporaryUserId,
        file.parentFolderId,
      )
    : [];

  if (file.parentFolderId) assertValidPath(file.parentFolderId, path);

  return {
    breadcrumbs: path.map(toVaultBreadcrumbDto),
    file: {
      createdAt: toIsoString(file.createdAt),
      id: file.id,
      name: file.name,
      parentFolderId: file.parentFolderId,
      size: file.size,
      status: file.status,
      type: file.type,
      updatedAt: toIsoString(file.updatedAt),
    },
  };
}

export class InvalidFolderHierarchyError extends Error {
  constructor(folderId: string) {
    super(`Folder hierarchy for ${folderId} does not reach the vault root`);
    this.name = "InvalidFolderHierarchyError";
  }
}
