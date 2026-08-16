import { formatFileSize } from "../../utils/file-size";
import { Button } from "../Button";
import { FileTypeIcon, PlusIcon } from "../VaultIcons";
import { useFileUpload, type UploadState } from "./useFileUpload";

type FileUploadProps = {
  onUploadSuccess?: () => void;
};

const phaseCopy: Partial<
  Record<UploadState["status"], { label: string; detail: string }>
> = {
  preparing: {
    label: "Preparing file",
    detail: "Calculating a secure checksum…",
  },
  initializing: {
    label: "Starting upload",
    detail: "Creating a secure upload session…",
  },
  verifying: {
    label: "Verifying upload",
    detail: "Confirming the file arrived safely…",
  },
};

export function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const {
    inputRef,
    isWorking,
    openFilePicker,
    selectedFile,
    selectFile,
    uploadSelectedFile,
    uploadState,
  } = useFileUpload({ onUploadSuccess });

  const phase = phaseCopy[uploadState.status];
  const showProgress =
    uploadState.status === "preparing" ||
    uploadState.status === "initializing" ||
    uploadState.status === "uploading" ||
    uploadState.status === "verifying";

  return (
    <div className={`w-full min-w-0 ${selectedFile ? "col-span-full" : ""}`}>
      <input
        aria-label="Choose a file to upload"
        className="sr-only"
        disabled={isWorking}
        onChange={selectFile}
        ref={inputRef}
        type="file"
      />

      {!selectedFile && (
        <button
          className="flex min-h-[3.875rem] w-full cursor-pointer items-center justify-center gap-2.5 rounded-[3px] border border-accent bg-transparent px-4 text-[0.875rem] text-accent transition-colors hover:bg-accent/[0.04] sm:text-[0.9375rem]"
          onClick={openFilePicker}
          type="button"
        >
          <PlusIcon className="size-5 shrink-0" />
          <span>Upload file</span>
        </button>
      )}

      {selectedFile && (
        <div className="rounded-[3px] border border-dashed border-[#8d99a8] px-3.5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <FileTypeIcon
              className="size-6 shrink-0 text-ink"
              fileName={selectedFile.name}
              type={selectedFile.type}
            />
            <div className="min-w-0 flex-1">
              <p
                className="m-0 truncate text-[0.8125rem] leading-5 text-ink sm:text-sm"
                title={selectedFile.name}
              >
                <span className="sr-only">Selected file: </span>
                {selectedFile.name}
              </p>
              <p className="mt-0.5 mb-0 truncate text-[0.6875rem] leading-5 text-muted sm:text-xs">
                <span className="sr-only">File details: </span>
                {formatFileSize(selectedFile.size)} ·{" "}
                {selectedFile.type || "Unknown type"}
              </p>
            </div>

            {!isWorking && uploadState.status !== "success" && (
              <button
                className="min-h-11 shrink-0 cursor-pointer border-0 bg-transparent px-1 text-xs text-muted transition-colors hover:text-ink"
                onClick={openFilePicker}
                type="button"
              >
                Replace
              </button>
            )}
          </div>

          {showProgress && (
            <div
              aria-live="polite"
              className="mt-3 border-t border-border pt-3"
              role="status"
            >
              <div className="mb-2 flex items-baseline justify-between gap-4 text-[0.6875rem]">
                <span className="text-ink">
                  {uploadState.status === "uploading"
                    ? "Uploading"
                    : phase?.label}
                </span>
                {uploadState.status === "uploading" && (
                  <span className="text-muted tabular-nums">
                    {Math.round(uploadState.progress)}%
                  </span>
                )}
              </div>
              <div
                aria-hidden="true"
                className="h-px w-full overflow-hidden bg-border"
              >
                <div
                  className={`h-full bg-ink transition-[width] duration-150 ${
                    uploadState.status === "uploading"
                      ? ""
                      : "w-1/3 animate-pulse"
                  }`}
                  style={
                    uploadState.status === "uploading"
                      ? { width: `${uploadState.progress}%` }
                      : undefined
                  }
                />
              </div>
              <p className="mt-2 mb-0 text-[0.6875rem] text-muted">
                {uploadState.status === "uploading"
                  ? `${formatFileSize(uploadState.loaded)} of ${formatFileSize(uploadState.total)}`
                  : phase?.detail}
              </p>
            </div>
          )}

          {uploadState.status === "success" && (
            <div
              className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3"
              role="status"
            >
              <p className="m-0 text-xs text-ink">Upload complete</p>
              <button
                className="min-h-11 cursor-pointer border-0 bg-transparent p-0 text-xs text-accent hover:text-accent-hover"
                onClick={openFilePicker}
                type="button"
              >
                Upload another
              </button>
            </div>
          )}

          {uploadState.status === "error" && (
            <p
              className="mt-3 mb-0 border-t border-border pt-3 text-xs text-destructive"
              role="alert"
            >
              {uploadState.message}
            </p>
          )}

          {!isWorking && uploadState.status !== "success" && (
            <Button
              className="mt-3 w-full"
              onClick={() => void uploadSelectedFile()}
              variant="primary"
            >
              {uploadState.status === "error" ? "Retry upload" : "Upload"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
