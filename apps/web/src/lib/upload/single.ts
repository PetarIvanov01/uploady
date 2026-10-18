import {
  api,
  type BodySingleUploadComplete,
  type BodySingleUploadInit,
  type ParamsSingleUploadComplete,
} from "../api";
import { responseErrorMessage } from "../../utils/error-message";

export async function initUploadSingle(
  payload: BodySingleUploadInit,
  signal?: AbortSignal,
) {
  let response = await api.v1.uploads.single.post(payload, {
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

export async function completeUploadSingle(
  { fileId }: ParamsSingleUploadComplete,
  payload: BodySingleUploadComplete,
  signal?: AbortSignal,
) {
  const response = await api.v1.uploads
    .single({ fileId })
    .complete.post(payload, { fetch: { signal } });

  if (response.error !== null) {
    throw new Error(
      responseErrorMessage(response.error, "The upload could not be verified."),
    );
  }

  return response.data;
}
