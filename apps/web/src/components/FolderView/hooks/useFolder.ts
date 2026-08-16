import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../lib/api";
import { folderApiErrorMessage, unknownErrorMessage } from "./folderApiError";
import type { FolderMetadata } from "./folder.types";

export type FolderState =
  | { folder: null; path: []; status: "idle" }
  | {
      folder: FolderMetadata | null;
      path: FolderMetadata[];
      status: "loading";
    }
  | { folder: FolderMetadata; path: FolderMetadata[]; status: "success" }
  | {
      folder: FolderMetadata | null;
      message: string;
      path: FolderMetadata[];
      status: "error";
    };

async function retrieveFolder(folderId: string): Promise<FolderMetadata> {
  const response = await api.v1.folders({ id: folderId }).get();

  if (response.error !== null) {
    throw new Error(
      folderApiErrorMessage(
        response.error,
        `Could not load the folder (${response.status}).`,
      ),
    );
  }

  return response.data;
}

export function useFolder(folderId: string | null) {
  const activeFolderIdRef = useRef(folderId);
  const [refreshCount, setRefreshCount] = useState(0);
  const [state, setState] = useState<FolderState>(
    folderId
      ? { folder: null, path: [], status: "loading" }
      : { folder: null, path: [], status: "idle" },
  );

  const refresh = useCallback(() => {
    if (folderId) setRefreshCount((count) => count + 1);
  }, [folderId]);

  useEffect(() => {
    let isCurrentRequest = true;

    if (!folderId) {
      activeFolderIdRef.current = null;
      setState({ folder: null, path: [], status: "idle" });
      return () => {
        isCurrentRequest = false;
      };
    }

    const locationChanged = activeFolderIdRef.current !== folderId;
    activeFolderIdRef.current = folderId;
    const activeFolderId = folderId;

    setState((current) => ({
      folder: locationChanged ? null : current.folder,
      path: locationChanged ? [] : current.path,
      status: "loading",
    }));

    async function loadFolder() {
      try {
        const path: FolderMetadata[] = [];
        const visitedFolderIds = new Set<string>();
        let nextFolderId: string | null = activeFolderId;

        while (nextFolderId) {
          if (visitedFolderIds.has(nextFolderId)) {
            throw new Error("The folder hierarchy contains a cycle.");
          }

          visitedFolderIds.add(nextFolderId);
          const folder = await retrieveFolder(nextFolderId);
          path.unshift(folder);
          nextFolderId = folder.parentFolderId;
        }

        if (isCurrentRequest) {
          setState({
            folder: path.at(-1)!,
            path,
            status: "success",
          });
        }
      } catch (error) {
        if (isCurrentRequest) {
          setState((current) => ({
            folder: current.folder,
            message: unknownErrorMessage(error, "Could not load the folder."),
            path: current.path,
            status: "error",
          }));
        }
      }
    }

    void loadFolder();

    return () => {
      isCurrentRequest = false;
    };
  }, [folderId, refreshCount]);

  return {
    ...state,
    refresh,
    retry: refresh,
  };
}
