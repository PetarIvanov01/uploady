type UploadFileInput = {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  file: File;
};

export async function uploadFile({
  name,
  size,
  type,
  lastModified,
  file,
}: UploadFileInput) {
  // storage/database/domain logic

  return {
    name,
    size,
    type,
    lastModified,
    receivedSize: file.size,
  };
}
