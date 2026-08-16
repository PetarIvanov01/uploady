import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../lib/api";
import {
  responseErrorMessage,
  unknownErrorMessage,
} from "../../../utils/error-message";
import type {
  CreateFolderInput,
  FolderMetadata,
  FolderMutationOperation,
  FolderMutationSuccess,
  UpdateFolderInput,
} from "./folder.types";

export type FolderMutationState =
  | { status: "idle" }
  | {
      folderId?: string;
      operation: FolderMutationOperation;
      status: "loading";
    }
  | (FolderMutationSuccess & { status: "success" })
  | {
      folderId?: string;
      message: string;
      operation: FolderMutationOperation;
      status: "error";
    };

type UseFolderMutationsOptions = {
  onSuccess?: (result: FolderMutationSuccess) => void;
};

export function useFolderMutations({
  onSuccess,
}: UseFolderMutationsOptions = {}) {
  const isMountedRef = useRef(true);
  const isWorkingRef = useRef(false);
  const [state, setState] = useState<FolderMutationState>({ status: "idle" });

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const reset = useCallback(() => setState({ status: "idle" }), []);

  const createFolder = useCallback(
    async (input: CreateFolderInput): Promise<FolderMetadata | null> => {
      if (isWorkingRef.current) return null;

      isWorkingRef.current = true;
      setState({ operation: "create", status: "loading" });

      try {
        const response = await api.v1.folders.post(input);

        if (response.error !== null) {
          throw new Error(
            responseErrorMessage(
              response.error,
              `Could not create the folder (${response.status}).`,
            ),
          );
        }

        const result: FolderMutationSuccess = {
          folder: response.data,
          operation: "create",
        };

        if (isMountedRef.current) {
          setState({ ...result, status: "success" });
          onSuccess?.(result);
        }

        return response.data;
      } catch (error) {
        if (isMountedRef.current) {
          setState({
            message: unknownErrorMessage(error, "Could not create the folder."),
            operation: "create",
            status: "error",
          });
        }

        return null;
      } finally {
        isWorkingRef.current = false;
      }
    },
    [onSuccess],
  );

  const updateFolder = useCallback(
    async (
      folderId: string,
      input: UpdateFolderInput,
    ): Promise<FolderMetadata | null> => {
      if (isWorkingRef.current) return null;

      isWorkingRef.current = true;
      setState({ folderId, operation: "update", status: "loading" });

      try {
        const response = await api.v1.folders({ id: folderId }).patch(input);

        if (response.error !== null) {
          throw new Error(
            responseErrorMessage(
              response.error,
              `Could not update the folder (${response.status}).`,
            ),
          );
        }

        const result: FolderMutationSuccess = {
          folder: response.data,
          operation: "update",
        };

        if (isMountedRef.current) {
          setState({ ...result, status: "success" });
          onSuccess?.(result);
        }

        return response.data;
      } catch (error) {
        if (isMountedRef.current) {
          setState({
            folderId,
            message: unknownErrorMessage(error, "Could not update the folder."),
            operation: "update",
            status: "error",
          });
        }

        return null;
      } finally {
        isWorkingRef.current = false;
      }
    },
    [onSuccess],
  );

  const deleteFolder = useCallback(
    async (folderId: string): Promise<boolean> => {
      if (isWorkingRef.current) return false;

      isWorkingRef.current = true;
      setState({ folderId, operation: "delete", status: "loading" });

      try {
        const response = await api.v1.folders({ id: folderId }).delete();

        if (response.error !== null) {
          throw new Error(
            responseErrorMessage(
              response.error,
              `Could not delete the folder (${response.status}).`,
            ),
          );
        }

        const result: FolderMutationSuccess = {
          folderId,
          operation: "delete",
        };

        if (isMountedRef.current) {
          setState({ ...result, status: "success" });
          onSuccess?.(result);
        }

        return true;
      } catch (error) {
        if (isMountedRef.current) {
          setState({
            folderId,
            message: unknownErrorMessage(error, "Could not delete the folder."),
            operation: "delete",
            status: "error",
          });
        }

        return false;
      } finally {
        isWorkingRef.current = false;
      }
    },
    [onSuccess],
  );

  return {
    ...state,
    createFolder,
    deleteFolder,
    isWorking: state.status === "loading",
    reset,
    updateFolder,
  };
}
