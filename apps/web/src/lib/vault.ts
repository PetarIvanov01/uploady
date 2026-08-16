import { notFound } from "@tanstack/react-router";
import type { FileMetadata } from "../components/FileList";
import type { FolderMetadata } from "../components/FolderView/hooks";
import { responseErrorMessage } from "../utils/error-message";
import { api } from "./api";

export type VaultLoaderData = {
  breadcrumbs: FolderMetadata[];
  currentFolder: FolderMetadata | null;
  files: FileMetadata[];
  folders: FolderMetadata[];
};

export class VaultLoadError extends Error {
  readonly status: number;

  constructor(message: string, status: number, options?: ErrorOptions) {
    super(message, options);
    this.name = "VaultLoadError";
    this.status = status;
  }
}

async function retrieveFolder(folderId: string, signal: AbortSignal) {
  const response = await api.v1.folders({ id: folderId }).get({
    fetch: { signal },
  });

  if (response.error === null) return response.data;
  if (response.status === 404) throw notFound({ data: { folderId } });

  throw new VaultLoadError(
    responseErrorMessage(
      response.error,
      `Could not load the folder (${response.status}).`,
    ),
    response.status,
  );
}

async function loadBreadcrumbs(folderId: string, signal: AbortSignal) {
  const breadcrumbs: FolderMetadata[] = [];
  const visitedFolderIds = new Set<string>();
  let nextFolderId: string | null = folderId;

  while (nextFolderId) {
    if (visitedFolderIds.has(nextFolderId)) {
      throw new VaultLoadError("The folder hierarchy contains a cycle.", 409);
    }

    visitedFolderIds.add(nextFolderId);
    const folder = await retrieveFolder(nextFolderId, signal);
    breadcrumbs.unshift(folder);
    nextFolderId = folder.parentFolderId;
  }

  return breadcrumbs;
}

async function listFolders(parentFolderId: string | null, signal: AbortSignal) {
  const response = await api.v1.folders.get({
    fetch: { signal },
    query: parentFolderId ? { parentFolderId } : {},
  });

  if (response.error === null) return response.data;
  if (response.status === 404 && parentFolderId) {
    throw notFound({ data: { folderId: parentFolderId } });
  }

  throw new VaultLoadError(
    responseErrorMessage(
      response.error,
      `Could not load folders (${response.status}).`,
    ),
    response.status,
  );
}

async function listRootFiles(signal: AbortSignal) {
  const response = await api.v1.uploads.get({ fetch: { signal } });

  if (response.error === null) return response.data;

  throw new VaultLoadError(
    responseErrorMessage(
      response.error,
      `Could not load files (${response.status}).`,
    ),
    response.status,
  );
}

export async function loadVaultContents(
  folderId: string | null,
  signal: AbortSignal,
): Promise<VaultLoaderData> {
  if (folderId === null) {
    const [folders, files] = await Promise.all([
      listFolders(null, signal),
      listRootFiles(signal),
    ]);

    return { breadcrumbs: [], currentFolder: null, files, folders };
  }

  const [breadcrumbs, folders] = await Promise.all([
    loadBreadcrumbs(folderId, signal),
    listFolders(folderId, signal),
  ]);

  return {
    breadcrumbs,
    currentFolder: breadcrumbs.at(-1)!,
    files: [],
    folders,
  };
}
