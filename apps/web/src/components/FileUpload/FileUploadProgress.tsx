import { formatFileSize } from "../../utils/file-size";
import type { UploadState } from "./useFileUpload";

export type FileUploadProgressState = Extract<
  UploadState,
  {
    status: "preparing" | "initializing" | "uploading" | "verifying";
  }
>;

type FileUploadProgressProps = {
  state: FileUploadProgressState;
};

type IndeterminateProgressState = Exclude<
  FileUploadProgressState,
  { status: "uploading" }
>;

const phaseCopy: Record<
  IndeterminateProgressState["status"],
  { label: string; detail: string }
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

export function FileUploadProgress({ state }: FileUploadProgressProps) {
  const isUploading = state.status === "uploading";

  return (
    <div
      aria-live="polite"
      className="mt-3 border-t border-border pt-3"
      role="status"
    >
      <div className="mb-2 flex items-baseline justify-between gap-4 text-[0.6875rem]">
        <span className="text-ink">
          {state.status === "uploading"
            ? "Uploading"
            : phaseCopy[state.status].label}
        </span>
        {isUploading && (
          <span className="text-muted tabular-nums">
            {Math.round(state.progress)}%
          </span>
        )}
      </div>
      <div aria-hidden="true" className="h-px w-full overflow-hidden bg-border">
        <div
          className={`h-full bg-ink transition-[width] duration-150 ${
            isUploading ? "" : "w-1/3 animate-pulse"
          }`}
          style={isUploading ? { width: `${state.progress}%` } : undefined}
        />
      </div>
      <p className="mt-2 mb-0 text-[0.6875rem] text-muted">
        {state.status === "uploading"
          ? `${formatFileSize(state.loaded)} of ${formatFileSize(state.total)}`
          : phaseCopy[state.status].detail}
      </p>
    </div>
  );
}
