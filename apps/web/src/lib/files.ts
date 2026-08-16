import { notFound } from "@tanstack/react-router";
import type { FileMetadata } from "../components/FileList";
import { responseErrorMessage } from "../utils/error-message";
import { api } from "./api";

export class FileLoadError extends Error {
  readonly status: number;

  constructor(message: string, status: number, options?: ErrorOptions) {
    super(message, options);
    this.name = "FileLoadError";
    this.status = status;
  }
}

export async function getFile(
  fileId: string,
  signal?: AbortSignal,
): Promise<FileMetadata> {
  let response;

  try {
    response = await api.v1.uploads({ id: fileId }).get({
      fetch: { signal },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new FileLoadError("Could not connect to the file service.", 0, {
      cause: error,
    });
  }

  if (response.error === null) return response.data;

  if (response.status === 404) {
    throw notFound({ data: { fileId } });
  }

  throw new FileLoadError(
    responseErrorMessage(
      response.error,
      `Could not load the file (${response.status}).`,
    ),
    response.status,
  );
}
