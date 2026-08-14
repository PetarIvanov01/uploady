type UploadFileInput = {
  name: string;
  file: File;
};

export async function uploadFile({ name, file }: UploadFileInput) {
  // storage/database/domain logic

  return {
    name,
    size: file.size,
  };
}
