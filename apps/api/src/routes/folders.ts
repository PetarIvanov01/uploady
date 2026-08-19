import { Elysia, t } from "elysia";
import {
  createFolder,
  createFolderBodySchema,
  deleteFolder,
  updateFolder,
  updateFolderBodySchema,
} from "../services/folders";

const folderIdParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
});

export const folders = new Elysia({ prefix: "/folders" })
  .post(
    "",
    async ({ body, status }) => {
      const result = await createFolder(body);

      if (result.status === "INVALID_NAME") {
        return status(400, { message: "Folder name cannot be blank" });
      }
      if (result.status === "PARENT_NOT_FOUND") {
        return status(404, { message: "Parent folder not found" });
      }
      if (result.status === "CYCLIC_PARENT") {
        return status(409, { message: "Folder hierarchy contains a cycle" });
      }

      return status(201, result.folder);
    },
    {
      body: createFolderBodySchema,
    },
  )
  .patch(
    "/:id",
    async ({ body, params, status }) => {
      const result = await updateFolder(params.id, body);

      if (result.status === "NOT_FOUND") {
        return status(404, { message: "Folder not found" });
      }
      if (result.status === "INVALID_NAME") {
        return status(400, { message: "Folder name cannot be blank" });
      }
      if (result.status === "PARENT_NOT_FOUND") {
        return status(404, { message: "Parent folder not found" });
      }
      if (result.status === "CYCLIC_PARENT") {
        return status(409, { message: "Folder move would create a cycle" });
      }

      return result.folder;
    },
    {
      body: updateFolderBodySchema,
      params: folderIdParamsSchema,
    },
  )
  .delete(
    "/:id",
    async ({ params, status }) => {
      try {
        const result = await deleteFolder(params.id);

        if (result.status === "NOT_FOUND") {
          return status(404, { message: "Folder not found" });
        }
        return status(204, undefined);
      } catch (error) {
        console.error("Internal error: ", error);
        return status(500, { message: "Internal Server Error." });
      }
    },
    {
      params: folderIdParamsSchema,
    },
  );
