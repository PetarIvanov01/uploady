import { useRef, useState, type ChangeEvent } from "react";
import { multipartUpload } from "./utils/upload-multipart";
import { uploadSingleFile } from "./utils/upload-single";
import { unknownErrorMessage } from "../../utils/error-message";

const singleUploadLimitBytes = 200 * 1024 * 1024;
const maximumFilesPerBatch = 5;

export type UploadState =
  | { status: "idle" }
  | { status: "preparing" }
  | { status: "initializing" }
  | {
      status: "uploading";
      expiresAt: string;
      loaded: number;
      progress: number;
      total: number;
    }
  | { status: "verifying" }
  | { status: "success"; fileCount: number; size: number }
  | { status: "error"; message: string; retryable: boolean };

type UploadItemStatus = "pending" | "success" | "error";
type UploadStrategy = "single" | "multipart";

type UploadItem = {
  file: File;
  id: string;
  status: UploadItemStatus;
  strategy: UploadStrategy;
};

type UseFileUploadOptions = {
  onUploadSuccess?: () => void;
};

export function useFileUpload({ onUploadSuccess }: UseFileUploadOptions = {}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isWorkingRef = useRef(false);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
  });

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;

    if (!files?.length) return;

    const selectedFiles = Array.from(files);

    setUploadItems(
      selectedFiles.map((file) => ({
        file,
        id: crypto.randomUUID(),
        status: "pending",
        strategy: file.size > singleUploadLimitBytes ? "multipart" : "single",
      })),
    );

    setUploadState(
      selectedFiles.length > maximumFilesPerBatch
        ? {
            status: "error",
            message: `You can upload up to ${maximumFilesPerBatch} files at a time.`,
            retryable: false,
          }
        : { status: "idle" },
    );
  }

  function openFilePicker() {
    if (!inputRef.current) return;

    inputRef.current.value = "";
    inputRef.current.click();
  }

  function updateUploadItem(id: string, changes: Partial<UploadItem>) {
    setUploadItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, ...changes } : item,
      ),
    );
  }

  async function uploadSelectedFiles() {
    if (uploadItems.length === 0 || isWorkingRef.current) return;

    if (uploadItems.length > maximumFilesPerBatch) {
      setUploadState({
        status: "error",
        message: `You can upload up to ${maximumFilesPerBatch} files at a time.`,
        retryable: false,
      });
      return;
    }

    const emptyFiles = uploadItems.filter((item) => item.file.size === 0);

    if (emptyFiles.length > 0) {
      setUploadState({
        status: "error",
        message:
          emptyFiles.length === 1
            ? `“${emptyFiles[0].file.name}” is empty and cannot be uploaded.`
            : `${emptyFiles.length} empty files cannot be uploaded.`,
        retryable: false,
      });
      return;
    }

    const totalSize = uploadItems.reduce(
      (total, item) => total + item.file.size,
      0,
    );

    const itemsToUpload = uploadItems.filter(
      (item) => item.status !== "success",
    );

    let completedSize = uploadItems.reduce(
      (total, item) => total + (item.status === "success" ? item.file.size : 0),
      0,
    );

    let uploadedAnyFile = false;
    const failedFiles: Array<{ message: string; name: string }> = [];
    const preservePhaseDuration = uploadItems.length === 1;

    isWorkingRef.current = true;

    try {
      for (const item of itemsToUpload) {
        const { file } = item;

        try {
          updateUploadItem(item.id, { status: "pending" });
          const uploadFile =
            item.strategy === "multipart" ? multipartUpload : uploadSingleFile;

          await uploadFile({
            body: file,
            name: file.name,
            onPhase: (status) => {
              setUploadState({ status });
            },
            onProgress: (loaded, expiresAt) => {
              const aggregateLoaded = Math.min(
                totalSize,
                completedSize + loaded,
              );
              const progress =
                totalSize > 0
                  ? Math.min(100, (aggregateLoaded / totalSize) * 100)
                  : 0;

              setUploadState({
                status: "uploading",
                expiresAt,
                loaded: aggregateLoaded,
                progress,
                total: totalSize,
              });
            },
            preservePhaseDuration,
          });
          completedSize += file.size;
          uploadedAnyFile = true;
          updateUploadItem(item.id, { status: "success" });
        } catch (error) {
          const message = unknownErrorMessage(error, "The upload failed.");

          failedFiles.push({ message, name: file.name });
          updateUploadItem(item.id, { status: "error" });
        }
      }

      if (failedFiles.length > 0) {
        setUploadState({
          status: "error",
          message:
            failedFiles.length === 1
              ? `“${failedFiles[0].name}” could not be uploaded: ${failedFiles[0].message}`
              : `${failedFiles.length} files could not be uploaded. Retry to try them again.`,
          retryable: true,
        });
      } else {
        setUploadState({
          status: "success",
          fileCount: uploadItems.length,
          size: totalSize,
        });
      }
    } finally {
      isWorkingRef.current = false;
    }

    if (uploadedAnyFile) onUploadSuccess?.();
  }

  return {
    inputRef,
    isWorking:
      uploadState.status === "preparing" ||
      uploadState.status === "initializing" ||
      uploadState.status === "uploading" ||
      uploadState.status === "verifying",
    openFilePicker,
    selectedFiles: uploadItems.map((item) => item.file),
    selectFiles,
    uploadSelectedFiles,
    uploadState,
  };
}
