import { Elysia, t } from "elysia";
import { listFiles } from "../services/list-files";
import { retrieveFile } from "../services/retrieve-file";
import { bodySchema, uploadFile } from "../services/upload-file";

const fileMetadataSchema = t.Object({
  id: t.String(),
  name: t.String(),
  size: t.Number(),
  type: t.String(),
  lastModified: t.Number(),
  createdAt: t.String(),
});

export const uploads = new Elysia({ prefix: "/uploads" })
  .post("", async ({ body, status }) => status(201, await uploadFile(body)), {
    body: bodySchema,
  })
  .post("/:id/completed", async ({ status }) => {
    return status(204);
  })
  .get("", listFiles, {
    response: {
      200: t.Array(fileMetadataSchema),
    },
  })
  .get(
    "/:id",
    async ({ params, status }) => {
      const file = await retrieveFile(params.id);

      if (!file) {
        return status(404, { message: "File not found" });
      }

      return file;
    },
    {
      params: t.Object({
        id: t.String({ format: "uuid" }),
      }),
      response: {
        200: fileMetadataSchema,
        404: t.Object({ message: t.String() }),
      },
    },
  );
