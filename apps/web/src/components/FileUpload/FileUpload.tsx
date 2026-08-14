import { formatFileSize } from "../../utils/file-size";
import { Button } from "../Button";
import { useFileUpload } from "./useFileUpload";

type FileUploadProps = {
  onUploadSuccess?: () => void;
};

export function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const {
    inputRef,
    isUploading,
    openFilePicker,
    selectedFile,
    selectFile,
    uploadSelectedFile,
    uploadState,
  } = useFileUpload({ onUploadSuccess });

  const statusTone =
    uploadState.status === "error"
      ? "whitespace-normal text-destructive"
      : uploadState.status === "success"
        ? "whitespace-nowrap text-ink"
        : "whitespace-nowrap text-muted";
  const statusClassName = [
    "m-0 max-w-[min(80vw,30rem)] overflow-hidden text-ellipsis text-[0.6875rem] leading-normal",
    statusTone,
  ].join(" ");

  return (
    <div className="flex min-w-0 flex-col items-start gap-3">
      <input
        aria-label="Choose a file to upload"
        className="sr-only"
        disabled={isUploading}
        onChange={selectFile}
        ref={inputRef}
        type="file"
      />

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={isUploading}
          onClick={openFilePicker}
          variant={selectedFile ? "secondary" : "primary"}
        >
          {selectedFile ? "Choose another" : "Choose file"}
        </Button>
        <Button
          aria-describedby={
            selectedFile
              ? uploadState.status === "idle"
                ? "selected-file"
                : "selected-file upload-status"
              : undefined
          }
          disabled={!selectedFile || isUploading}
          onClick={() => void uploadSelectedFile()}
          variant="primary"
        >
          {isUploading ? "Uploading…" : "Upload"}
        </Button>
      </div>

      {selectedFile && (
        <div className="min-w-0" id="selected-file">
          <p
            className="m-0 max-w-[min(80vw,30rem)] overflow-hidden text-ellipsis whitespace-nowrap text-xs text-ink"
            title={selectedFile.name}
          >
            <span className="sr-only">Selected file: </span>
            {selectedFile.name}
          </p>
          <p className="m-0 text-[0.6875rem] leading-normal text-muted">
            <span className="sr-only">File size: </span>
            {formatFileSize(selectedFile.size)}
          </p>
        </div>
      )}

      {uploadState.status !== "idle" && (
        <p
          className={statusClassName}
          id="upload-status"
          role={uploadState.status === "error" ? "alert" : "status"}
        >
          {uploadState.status === "uploading" && "Uploading…"}
          {uploadState.status === "success" &&
            `Uploaded ${uploadState.fileName} · ${formatFileSize(uploadState.size)}`}
          {uploadState.status === "error" && uploadState.message}
        </p>
      )}
    </div>
  );
}
