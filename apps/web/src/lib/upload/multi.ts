import {
  api,
  type BodyMultiUploadComplete,
  type BodyMultiUploadInit,
  type ParamsMultiUploadAbort,
  type ParamsMultiUploadComplete,
  type ParamsMultiUploadPart,
} from "../api";
import { responseErrorMessage } from "../../utils/error-message";

export async function initUploadMulti(
  payload: BodyMultiUploadInit,
  signal?: AbortSignal,
) {
  let response = await api.v1.uploads.multipart.post(payload, {
    fetch: { signal },
  });

  if (response.error !== null) {
    throw new Error(
      responseErrorMessage(
        response.error,
        `Could not initialize the upload (${response.status}).`,
      ),
    );
  }
  return response.data;
}

export async function uploadPartToDB(
  { partNumber, uploadSessionId }: ParamsMultiUploadPart,
  signal?: AbortSignal,
) {
  let response = await api.v1.uploads
    .multipart({ uploadSessionId })
    .parts({ partNumber })
    .post(undefined, { fetch: { signal } });

  if (response.error !== null) {
    throw new Error(
      responseErrorMessage(
        response.error,
        `Failed to upload the part (${response.status}).`,
      ),
    );
  }
  return response.data;
}

export async function uploadPartToS3(
  method: "PUT",
  url: string,
  chunk: Blob,
  signal?: AbortSignal,
) {
  let response: Response;

  try {
    response = await fetch(url, {
      body: chunk,
      method,
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;

    throw new Error("The storage service could not be reached.", {
      cause: error,
    });
  }

  if (!response.ok) {
    throw new Error(`Storage part upload failed (${response.status}).`);
  }

  const etag = response.headers.get("etag");

  if (!etag) {
    throw new Error(
      "Storage accepted the part but did not expose its ETag response header.",
    );
  }

  return etag;
}

export async function completeUploadMulti(
  { uploadSessionId }: ParamsMultiUploadComplete,
  payload: BodyMultiUploadComplete,
  signal?: AbortSignal,
) {
  const response = await api.v1.uploads
    .multipart({ uploadSessionId })
    .complete.post(payload, { fetch: { signal } });

  if (response.error !== null) {
    throw new Error(
      responseErrorMessage(response.error, "The upload could not be verified."),
    );
  }

  return response.data;
}

export async function abortUploadMulti(
  { uploadSessionId }: ParamsMultiUploadAbort,
  signal?: AbortSignal,
) {
  const response = await api.v1.uploads
    .multipart({ uploadSessionId })
    .delete(undefined, { fetch: { signal } });

  if (response.error !== null) {
    throw new Error(
      responseErrorMessage(response.error, "The upload could not be aborted."),
    );
  }
}
