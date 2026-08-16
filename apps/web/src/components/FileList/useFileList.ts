import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import {
  responseErrorMessage,
  unknownErrorMessage,
} from "../../utils/error-message";

export type FileMetadata = {
  createdAt: string;
  id: string;
  itemCount?: number;
  name: string;
  size: number;
  status: "UPLOADING" | "READY" | "FAILED" | "DELETED";
  type: string;
};

export function isFolder(item: FileMetadata) {
  const normalizedType = item.type.toLowerCase();

  return (
    normalizedType === "folder" ||
    normalizedType === "inode/directory" ||
    item.name.endsWith("/")
  );
}

type FileListState =
  | { status: "loading"; files: FileMetadata[] }
  | { status: "success"; files: FileMetadata[] }
  | { status: "error"; files: FileMetadata[]; message: string };

export function useFileList(refreshKey = 0) {
  const [retryCount, setRetryCount] = useState(0);
  const [state, setState] = useState<FileListState>({
    status: "loading",
    files: [],
  });

  useEffect(() => {
    let isCurrentRequest = true;

    async function loadFiles() {
      setState((current) => ({
        status: "loading",
        files: current.files,
      }));

      try {
        const response = await api.v1.uploads.get();

        if (response.error !== null) {
          throw new Error(
            responseErrorMessage(
              response.error,
              `Could not load files (${response.status}).`,
            ),
          );
        }

        if (isCurrentRequest) {
          setState({ status: "success", files: response.data });
        }
      } catch (error) {
        if (isCurrentRequest) {
          setState((current) => ({
            status: "error",
            files: current.files,
            message: unknownErrorMessage(error, "Could not load files."),
          }));
        }
      }
    }

    void loadFiles();

    return () => {
      isCurrentRequest = false;
    };
  }, [refreshKey, retryCount]);

  return {
    ...state,
    retry: () => setRetryCount((count) => count + 1),
  };
}
