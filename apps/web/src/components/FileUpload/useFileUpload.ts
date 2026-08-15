import { useRef, useState, type ChangeEvent } from "react";
import { api } from "../../lib/api";

const singleUploadLimitBytes = 200 * 1024 * 1024;
const minimumPhaseDurationMs = 350;

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

async function waitForMinimumDuration(startedAt: number) {
  const remaining = minimumPhaseDurationMs - (performance.now() - startedAt);

  if (remaining > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, remaining));
  }
}

type StorageUploadOptions = {
  file: File;
  headers: Record<string, string>;
  method: string;
  onProgress: (loaded: number, total: number) => void;
  url: string;
};

function uploadToStorage({
  file,
  headers,
  method,
  onProgress,
  url,
}: StorageUploadOptions) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open(method, url);
    Object.entries(headers).forEach(([name, value]) => {
      request.setRequestHeader(name, value);
    });

    request.upload.addEventListener("progress", (event) => {
      onProgress(
        event.loaded,
        event.lengthComputable ? event.total : file.size,
      );
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(file.size, file.size);
        resolve();
        return;
      }

      reject(new Error(`Storage upload failed (${request.status}).`));
    });
    request.addEventListener("error", () => {
      reject(new Error("The storage upload could not be reached."));
    });
    request.addEventListener("timeout", () => {
      reject(new Error("The storage upload timed out."));
    });
    request.send(file);
  });
}

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

    if (selectedFile.size === 0) {
      setUploadState({
        status: "error",
        message: "Empty files cannot be uploaded.",
      });
      return;
    }

    if (selectedFile.size > singleUploadLimitBytes) {
      setUploadState({
        status: "error",
        message: "Files over 200 MB are not supported yet.",
      });
      return;
    }

    try {
      const preparingStartedAt = performance.now();
      setUploadState({ status: "preparing" });
      const checksum = await calculateChecksum(selectedFile);
      await waitForMinimumDuration(preparingStartedAt);

      const contentType = selectedFile.type || "application/octet-stream";
      const payload = {
        checksum,
        name: selectedFile.name,
        size: selectedFile.size,
        type: contentType,
      };

      const initializingStartedAt = performance.now();
      setUploadState({ status: "initializing" });
      const response = await api.v1.uploads.single.post(payload);

      if (response.error !== null) {
        throw new Error(
          `Could not initialize the upload (${response.status}).`,
        );
      }

      const session = response.data;
      await waitForMinimumDuration(initializingStartedAt);

      const uploadingStartedAt = performance.now();
      setUploadState({
        status: "uploading",
        expiresAt: session.expiresAt,
        loaded: 0,
        progress: 0,
        total: selectedFile.size,
      });
      await uploadToStorage({
        file: selectedFile,
        headers: session.headers,
        method: session.method,
        onProgress: (loaded, total) => {
          setUploadState({
            status: "uploading",
            expiresAt: session.expiresAt,
            loaded,
            progress: total > 0 ? Math.min(100, (loaded / total) * 100) : 0,
            total,
          });
        },
        url: session.uploadUrl,
      });
      await waitForMinimumDuration(uploadingStartedAt);

      const verifyingStartedAt = performance.now();
      setUploadState({ status: "verifying" });
      const completionResponse = await api.v1.uploads
        .single({ fileId: session.fileId })
        .complete.post({ uploadSessionId: session.uploadSessionId });

      if (completionResponse.error !== null) {
        const message = completionResponse.error.value.message;
        throw new Error(message || "The upload could not be verified.");
      }

      await waitForMinimumDuration(verifyingStartedAt);
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

  const isWorking =
    uploadState.status === "preparing" ||
    uploadState.status === "initializing" ||
    uploadState.status === "uploading" ||
    uploadState.status === "verifying";

  return {
    inputRef,
    isWorking,
    openFilePicker,
    selectedFile,
    selectFile,
    uploadSelectedFile,
    uploadState,
  };
}
