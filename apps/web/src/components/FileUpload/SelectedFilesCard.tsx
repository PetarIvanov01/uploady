import { formatFileSize } from "../../utils/file-size";
import { Button } from "../Button";
import { FileTypeIcon } from "../VaultIcons";
import {
  FileUploadProgress,
  type FileUploadProgressState,
} from "./FileUploadProgress";
import type { UploadState } from "./useFileUpload";

type SelectedFilesCardProps = {
  files: File[];
  isWorking: boolean;
  onReplace: () => void;
  onUpload: () => Promise<void>;
  uploadState: UploadState;
};

function isFileUploadProgressState(
  state: UploadState,
): state is FileUploadProgressState {
  return (
    state.status === "preparing" ||
    state.status === "initializing" ||
    state.status === "uploading" ||
    state.status === "verifying"
  );
}

export function SelectedFilesCard({
  files,
  isWorking,
  onReplace,
  onUpload,
  uploadState,
}: SelectedFilesCardProps) {
  const totalSize = files.reduce((total, file) => total + file.size, 0);
  const canUpload = uploadState.status !== "error" || uploadState.retryable;

  return (
    <div className="rounded-[3px] border border-dashed border-[#8d99a8] px-3.5 py-3">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="m-0 text-xs text-muted">
          {files.length === 1 ? "1 file" : `${files.length} files`} selected ·{" "}
          {formatFileSize(totalSize)}
        </p>

        {!isWorking && uploadState.status !== "success" && (
          <button
            className="min-h-11 shrink-0 cursor-pointer border-0 bg-transparent px-1 text-xs text-muted transition-colors hover:text-ink"
            onClick={onReplace}
            type="button"
          >
            Replace
          </button>
        )}
      </div>

      <div className="max-h-52 overflow-y-auto border-t border-border">
        {files.map((file, index) => (
          <div
            className="flex min-w-0 items-center gap-3 border-b border-border py-2.5 last:border-b-0"
            key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
          >
            <FileTypeIcon
              className="size-6 shrink-0 text-ink"
              fileName={file.name}
              type={file.type}
            />
            <div className="min-w-0 flex-1">
              <p
                className="m-0 truncate text-[0.8125rem] leading-5 text-ink sm:text-sm"
                title={file.name}
              >
                <span className="sr-only">Selected file: </span>
                {file.name}
              </p>
              <p className="mt-0.5 mb-0 truncate text-[0.6875rem] leading-5 text-muted sm:text-xs">
                <span className="sr-only">File details: </span>
                {formatFileSize(file.size)} · {file.type || "Unknown type"}
              </p>
            </div>
          </div>
        ))}
      </div>

      {isFileUploadProgressState(uploadState) && (
        <FileUploadProgress state={uploadState} />
      )}

      {uploadState.status === "success" && (
        <div
          className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3"
          role="status"
        >
          <p className="m-0 text-xs text-ink">
            {uploadState.fileCount === 1
              ? "Upload complete"
              : `${uploadState.fileCount} files uploaded`}
          </p>
          <button
            className="min-h-11 cursor-pointer border-0 bg-transparent p-0 text-xs text-accent hover:text-accent-hover"
            onClick={onReplace}
            type="button"
          >
            Upload more
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

      {!isWorking && uploadState.status !== "success" && canUpload && (
        <Button
          className="mt-3 w-full"
          onClick={() => void onUpload()}
          variant="primary"
        >
          {uploadState.status === "error"
            ? "Retry upload"
            : files.length === 1
              ? "Upload"
              : `Upload ${files.length} files`}
        </Button>
      )}
    </div>
  );
}
