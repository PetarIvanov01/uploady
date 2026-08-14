import { Elysia, t } from "elysia";
import { uploadFile } from "../services/upload-file";

export const uploads = new Elysia({ prefix: "/uploads" }).post(
  "",
  async ({ body, status }) => {
    const result = await uploadFile(body);

    return status(201, result);
  },
  {
    body: t.Object({
      name: t.String(),
      file: t.File(),
    }),
  },
);
