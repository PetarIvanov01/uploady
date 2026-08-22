import type {
  CompleteMultipartUploadInput,
  CompleteMultipartUploadResult,
  MultipartPartParams,
  MultipartPartUploadUrlResult,
  MultipartUploadInput,
  MultipartUploadResult,
} from "./multipart-upload.types";

export async function initiateMultipartUpload(
  _input: MultipartUploadInput,
): Promise<MultipartUploadResult> {
  throw new MultipartUploadNotImplementedError();
}

export async function createMultipartPartUploadUrl(
  _params: MultipartPartParams,
): Promise<MultipartPartUploadUrlResult> {
  throw new MultipartUploadNotImplementedError();
}

export async function completeMultipartUpload(
  _uploadSessionId: string,
  _input: CompleteMultipartUploadInput,
): Promise<CompleteMultipartUploadResult> {
  throw new MultipartUploadNotImplementedError();
}

export async function abortMultipartUpload(
  _uploadSessionId: string,
): Promise<void> {
  throw new MultipartUploadNotImplementedError();
}

export class MultipartUploadNotImplementedError extends Error {
  constructor() {
    super("Multipart uploads are not implemented yet");
    this.name = "MultipartUploadNotImplementedError";
  }
}
