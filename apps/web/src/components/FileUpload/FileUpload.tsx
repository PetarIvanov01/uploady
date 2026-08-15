import { formatFileSize } from "../../utils/file-size";
import { Button } from "../Button";
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
    <div className="flex w-full max-w-2xl min-w-0 flex-col items-start gap-3">
      <input
        aria-label="Choose a file to upload"
        className="sr-only"
        disabled={isWorking}
        onChange={selectFile}
        ref={inputRef}
        type="file"
      />

      {selectedFile && (
        <div
          className="flex w-full min-w-0 items-start justify-between gap-4 border-y border-border py-3"
          id="selected-file"
        >
          <div className="min-w-0">
            <p
              className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-ink"
              title={selectedFile.name}
            >
              <span className="sr-only">Selected file: </span>
              {selectedFile.name}
            </p>
            <p className="mt-1 mb-0 text-[0.6875rem] text-muted">
              <span className="sr-only">File details: </span>
              {formatFileSize(selectedFile.size)} ·{" "}
              {selectedFile.type || "Unknown type"}
            </p>
          </div>
          {!isWorking && (
            <button
              className="min-h-11 shrink-0 cursor-pointer border-0 bg-transparent px-1 text-xs text-muted transition-colors hover:text-ink sm:min-h-0"
              onClick={openFilePicker}
              type="button"
            >
              Replace
            </button>
          )}
        </div>
      )}

      {!selectedFile && (
        <Button onClick={openFilePicker} variant="primary">
          Choose file
        </Button>
      )}

      {selectedFile && !isWorking && uploadState.status !== "success" && (
        <Button
          aria-describedby="selected-file"
          onClick={() => void uploadSelectedFile()}
          variant="primary"
        >
          {uploadState.status === "error" ? "Retry upload" : "Upload"}
        </Button>
      )}

      {showProgress && (
        <div
          aria-live="polite"
          className="w-full"
          id="upload-status"
          role="status"
        >
          <div className="mb-2 flex items-baseline justify-between gap-4 text-[0.6875rem]">
            <span className="text-ink">
              {uploadState.status === "uploading" ? "Uploading" : phase?.label}
            </span>
            {uploadState.status === "uploading" && (
              <span className="text-muted">
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
                uploadState.status === "uploading" ? "" : "w-1/3 animate-pulse"
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
          className="flex flex-wrap items-center gap-x-4 gap-y-2"
          role="status"
        >
          <p className="m-0 text-xs text-ink">
            Uploaded {uploadState.fileName} · {formatFileSize(uploadState.size)}
          </p>
          <button
            className="min-h-11 cursor-pointer border-0 bg-transparent p-0 text-xs text-accent hover:text-accent-hover sm:min-h-0"
            onClick={openFilePicker}
            type="button"
          >
            Upload another
          </button>
        </div>
      )}

      {uploadState.status === "error" && (
        <p className="m-0 max-w-xl text-xs text-destructive" role="alert">
          {uploadState.message}
        </p>
      )}
    </div>
  );
}
