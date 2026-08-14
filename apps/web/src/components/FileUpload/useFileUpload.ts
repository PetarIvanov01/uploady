import { useRef, useState, type ChangeEvent } from "react";
import { api } from "../../lib/api";

export type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "success"; fileName: string; size: number }
  | { status: "error"; message: string };

export function useFileUpload() {
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

    const payload = {
      file: selectedFile,
      lastModified: selectedFile.lastModified,
      size: selectedFile.size,
      name: selectedFile.name,
      type: selectedFile.type,
    };

    try {
      const response = await api.v1.uploads.post(payload);

      if (response.error !== null) {
        throw new Error(`Upload failed with status ${response.status}.`);
      }

      const result = response.data;

      setUploadState({
        status: "success",
        fileName: result.name,
        size: result.size,
      });
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
