import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../lib/api";
import { folderApiErrorMessage, unknownErrorMessage } from "./folderApiError";
import type { FolderMetadata } from "./folder.types";

export type FolderListState =
  | { folders: FolderMetadata[]; status: "loading" }
  | { folders: FolderMetadata[]; status: "success" }
  | { folders: FolderMetadata[]; message: string; status: "error" };

export function useFolders(parentFolderId: string | null = null) {
  const activeParentFolderIdRef = useRef(parentFolderId);
  const [refreshCount, setRefreshCount] = useState(0);
  const [state, setState] = useState<FolderListState>({
    folders: [],
    status: "loading",
  });

  const refresh = useCallback(() => {
    setRefreshCount((count) => count + 1);
  }, []);

  useEffect(() => {
    let isCurrentRequest = true;

    async function loadFolders() {
      const locationChanged =
        activeParentFolderIdRef.current !== parentFolderId;
      activeParentFolderIdRef.current = parentFolderId;

      setState((current) => ({
        folders: locationChanged ? [] : current.folders,
        status: "loading",
      }));

      try {
        const response = await api.v1.folders.get({
          query: parentFolderId ? { parentFolderId } : {},
        });

        if (response.error !== null) {
          throw new Error(
            folderApiErrorMessage(
              response.error,
              `Could not load folders (${response.status}).`,
            ),
          );
        }

        if (isCurrentRequest) {
          setState({ folders: response.data, status: "success" });
        }
      } catch (error) {
        if (isCurrentRequest) {
          setState((current) => ({
            folders: current.folders,
            message: unknownErrorMessage(error, "Could not load folders."),
            status: "error",
          }));
        }
      }
    }

    void loadFolders();

    return () => {
      isCurrentRequest = false;
    };
  }, [parentFolderId, refreshCount]);

  return {
    ...state,
    refresh,
    retry: refresh,
  };
}
