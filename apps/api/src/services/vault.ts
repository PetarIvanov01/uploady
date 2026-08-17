import {
  vaultReadRepository,
  type VaultBreadcrumbRecord,
  type VaultEntryRecord,
  type VaultFileRecord,
} from "../repositories/vault-read.repository";

// TODO: Replace this with the authenticated user's ID once auth is introduced.
const temporaryUserId = "9e9a548c-dced-4f30-958d-19d423b53028";

export interface VaultBreadcrumb {
  id: string;
  name: string;
}

export interface VaultFolderEntry {
  counts: { files: number; folders: number };
  createdAt: string;
  id: string;
  kind: "folder";
  name: string;
  updatedAt: string;
}

export interface VaultFileEntry {
  createdAt: string;
  id: string;
  kind: "file";
  name: string;
  size: number;
  status: VaultFileRecord["status"];
  type: string;
  updatedAt: string;
}

export type VaultEntry = VaultFileEntry | VaultFolderEntry;

export interface RootVaultResult {
  breadcrumbs: [];
  entries: VaultEntry[];
  location: { kind: "root" };
}

export interface FolderVaultResult {
  breadcrumbs: VaultBreadcrumb[];
  entries: VaultEntry[];
  location: {
    createdAt: string;
    id: string;
    kind: "folder";
    name: string;
    parentFolderId: string | null;
    updatedAt: string;
  };
}

export interface FileVaultResult {
  breadcrumbs: VaultBreadcrumb[];
  file: {
    createdAt: string;
    id: string;
    name: string;
    parentFolderId: string | null;
    size: number;
    status: VaultFileRecord["status"];
    type: string;
    updatedAt: string;
  };
}

export class InvalidFolderHierarchyError extends Error {
  constructor(folderId: string) {
    super(`Folder hierarchy for ${folderId} does not reach the vault root`);
    this.name = "InvalidFolderHierarchyError";
  }
}

function toBreadcrumb(folder: VaultBreadcrumbRecord): VaultBreadcrumb {
  return { id: folder.id, name: folder.name };
}

function toIsoString(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function toEntry(record: VaultEntryRecord): VaultEntry {
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
    entries: entries.map(toEntry),
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
    breadcrumbs: path.map(toBreadcrumb),
    entries: entries.map(toEntry),
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
    breadcrumbs: path.map(toBreadcrumb),
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
