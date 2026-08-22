import type { VaultFileRecord } from "../../repositories/vault-read.repository";

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
