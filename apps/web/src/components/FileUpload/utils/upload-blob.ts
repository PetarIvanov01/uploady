type StorageUploadOptions = {
  body: Blob;
  headers: Record<string, string>;
  method: string;
  onProgress: (loaded: number, total: number) => void;
  url: string;
};

export function uploadToStorage({
  body,
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
      const total = event.lengthComputable ? event.total : body.size;

      onProgress(event.loaded, total);
    });

    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(body.size, body.size);
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

    request.addEventListener("abort", () => {
      reject(new Error("The storage upload was aborted."));
    });

    request.send(body);
  });
}
