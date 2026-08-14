import { Elysia } from "elysia";
import { uploadFile, bodySchema } from "../services/upload-file";

export const uploads = new Elysia({ prefix: "/uploads" }).post(
  "",
  async ({ body, status }) => {
    const result = await uploadFile(body);

    console.log(body);
    return status(201, result);
  },
  {
    body: bodySchema,
  },
);
