import { notFound } from "@tanstack/react-router";
import type { FileMetadata } from "../components/FileList";
import type { FolderMetadata } from "../components/FolderView/hooks";
import { responseErrorMessage } from "../utils/error-message";
import { api } from "./api";

type VaultBreadcrumb = { id: string; name: string };
type VaultFolderMetadata = FolderMetadata & {
  counts: { files: number; folders: number };
};

export type VaultLoaderData = {
  breadcrumbs: VaultBreadcrumb[];
  currentFolder: FolderMetadata | null;
  files: FileMetadata[];
  folders: VaultFolderMetadata[];
};

export class VaultLoadError extends Error {
  readonly status: number;

  constructor(message: string, status: number, options?: ErrorOptions) {
    super(message, options);
    this.name = "VaultLoadError";
    this.status = status;
  }
}

function mapVaultData(
  data:
    | Awaited<ReturnType<typeof api.v1.vault.get>>["data"]
    | Awaited<
        ReturnType<ReturnType<typeof api.v1.vault.folders>["get"]>
      >["data"],
  parentFolderId: string | null,
): VaultLoaderData {
  if (!data) {
    throw new VaultLoadError("The vault response did not contain data.", 500);
  }

  const folders: VaultFolderMetadata[] = [];
  const files: FileMetadata[] = [];

  for (const entry of data.entries) {
    if (entry.kind === "folder") {
      folders.push({
        counts: entry.counts,
        createdAt: entry.createdAt,
        id: entry.id,
        name: entry.name,
        parentFolderId,
        updatedAt: entry.updatedAt,
      });
    } else {
      files.push({
        createdAt: entry.createdAt,
        id: entry.id,
        name: entry.name,
        size: entry.size,
        status: entry.status,
        type: entry.type,
        updatedAt: entry.updatedAt,
      });
    }
  }

  const currentFolder =
    data.location.kind === "folder"
      ? {
          createdAt: data.location.createdAt,
          id: data.location.id,
          name: data.location.name,
          parentFolderId: data.location.parentFolderId,
          updatedAt: data.location.updatedAt,
        }
      : null;

  return {
    breadcrumbs: data.breadcrumbs,
    currentFolder,
    files,
    folders,
  };
}

async function loadRootVault(signal: AbortSignal) {
  const response = await api.v1.vault.get({ fetch: { signal } });

  if (response.error === null) return mapVaultData(response.data, null);

  throw new VaultLoadError(
    responseErrorMessage(
      response.error,
      `Could not load the vault (${response.status}).`,
    ),
    response.status,
  );
}

async function loadFolderVault(folderId: string, signal: AbortSignal) {
  const response = await api.v1.vault.folders({ id: folderId }).get({
    fetch: { signal },
  });

  if (response.error === null) return mapVaultData(response.data, folderId);
  if (response.status === 404) throw notFound({ data: { folderId } });

  throw new VaultLoadError(
    responseErrorMessage(
      response.error,
      `Could not load the folder (${response.status}).`,
    ),
    response.status,
  );
}

export function loadVaultContents(
  folderId: string | null,
  signal: AbortSignal,
): Promise<VaultLoaderData> {
  return folderId === null
    ? loadRootVault(signal)
    : loadFolderVault(folderId, signal);
}
