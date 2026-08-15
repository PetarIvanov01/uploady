import { useRef, useState, type ChangeEvent } from "react";
import { api } from "../../lib/api";

const singleUploadLimitBytes = 200 * 1024 * 1024;

async function calculateChecksum(file: File) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  const hexadecimal = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return `sha256:${hexadecimal}`;
}

export type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "success"; fileName: string; size: number }
  | { status: "error"; message: string };

type UseFileUploadOptions = {
  onUploadSuccess?: () => void;
};

export function useFileUpload({ onUploadSuccess }: UseFileUploadOptions = {}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
  });

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setSelectedFile(file);
    setUploadState({ status: "idle" });
  }

  function openFilePicker() {
    if (!inputRef.current) return;

    inputRef.current.value = "";
    inputRef.current.click();
  }

  async function uploadSelectedFile() {
    if (!selectedFile || uploadState.status === "uploading") return;

    setUploadState({ status: "uploading" });

    try {
      const contentType = selectedFile.type || "application/octet-stream";
      const payload = {
        checksum: await calculateChecksum(selectedFile),
        name: selectedFile.name,
        size: selectedFile.size,
        type: contentType,
      };

      if (selectedFile.size > singleUploadLimitBytes) {
        const multipartResponse = await api.v1.uploads.multipart.post(payload);

        if (multipartResponse.error !== null) {
          throw new Error("Multipart uploads are not available yet.");
        }

        throw new Error("Multipart upload initialization is incomplete.");
      }

      const response = await api.v1.uploads.single.post(payload);

      if (response.error !== null) {
        throw new Error(
          `Could not initialize the upload (${response.status}).`,
        );
      }

      const session = response.data;
      const uploadResponse = await fetch(session.uploadUrl, {
        method: session.method,
        headers: session.headers,
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Storage upload failed (${uploadResponse.status}).`);
      }

      const completionResponse = await api.v1.uploads
        .single({ fileId: session.fileId })
        .complete.post({ uploadSessionId: session.uploadSessionId });

      if (completionResponse.error !== null) {
        throw new Error(
          `Could not complete the upload (${completionResponse.status}).`,
        );
      }

      setUploadState({
        status: "success",
        fileName: selectedFile.name,
        size: selectedFile.size,
      });
      onUploadSuccess?.();
    } catch (error) {
      setUploadState({
        status: "error",
        message: error instanceof Error ? error.message : "The upload failed.",
      });
    }
  }

  return {
    inputRef,
    isUploading: uploadState.status === "uploading",
    openFilePicker,
    selectedFile,
    selectFile,
    uploadSelectedFile,
    uploadState,
  };
}
