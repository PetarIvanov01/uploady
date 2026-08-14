import { t, type UnwrapSchema } from "elysia";

export const bodySchema = t.Object({
  name: t.String(),
  size: t.Numeric(),
  type: t.String(),
  lastModified: t.Numeric(),
  file: t.File(),
});

type UploadFileInput = UnwrapSchema<typeof bodySchema>;

export async function uploadFile({
  name,
  size,
  type,
  lastModified,
  file,
}: UploadFileInput) {
  // tuka bazata shte igrae

  return {
    name,
    size,
    type,
    lastModified,
    receivedSize: file.size,
  };
}
