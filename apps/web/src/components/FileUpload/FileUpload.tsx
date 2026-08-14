import { useRef, useState, type ChangeEvent } from "react";
import { Button } from "../Button";
import "./file_upload.css";

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; fileName: string }
  | { status: "success"; fileName: string; size: number }
  | { status: "error"; message: string };

type UploadResponse = {
  name: string;
  size: number;
};

const uploadEndpoint = "/api/v1/uploads";

function isUploadResponse(value: unknown): value is UploadResponse {
  if (typeof value !== "object" || value === null) return false;

  return (
    "name" in value &&
    typeof value.name === "string" &&
    "size" in value &&
    typeof value.size === "number"
  );
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
  });

  async function uploadSelectedFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setUploadState({ status: "uploading", fileName: file.name });

    const formData = new FormData();
    formData.append("name", file.name);
    formData.append("file", file);

    try {
      const response = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData,
      });
      const responseBody: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}.`);
      }

      if (!isUploadResponse(responseBody)) {
        throw new Error("The server returned an unexpected response.");
      }

      setUploadState({
        status: "success",
        fileName: responseBody.name,
        size: responseBody.size,
      });
    } catch (error) {
      setUploadState({
        status: "error",
        message: error instanceof Error ? error.message : "The upload failed.",
      });
    }
  }

  const isUploading = uploadState.status === "uploading";

  return (
    <div className="file-upload">
      <input
        className="file-upload__input"
        disabled={isUploading}
        onChange={(event) => void uploadSelectedFile(event)}
        ref={inputRef}
        type="file"
      />
      <Button
        aria-describedby={
          uploadState.status === "idle" ? undefined : "upload-status"
        }
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        variant="primary"
      >
        {isUploading ? "Uploading…" : "Upload"}
      </Button>

      {uploadState.status !== "idle" && (
        <p
          className={`file-upload__status file-upload__status--${uploadState.status}`}
          id="upload-status"
          role={uploadState.status === "error" ? "alert" : "status"}
        >
          {uploadState.status === "uploading" &&
            `Uploading ${uploadState.fileName}…`}
          {uploadState.status === "success" &&
            `Uploaded ${uploadState.fileName} · ${formatFileSize(uploadState.size)}`}
          {uploadState.status === "error" && uploadState.message}
        </p>
      )}
    </div>
  );
}
