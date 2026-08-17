import { Elysia, t } from "elysia";
import {
  createFolder,
  createFolderBodySchema,
  deleteFolder,
  updateFolder,
  updateFolderBodySchema,
} from "../services/folders";

const folderSchema = t.Object({
  createdAt: t.String(),
  id: t.String({ format: "uuid" }),
  name: t.String(),
  parentFolderId: t.Nullable(t.String({ format: "uuid" })),
  updatedAt: t.String(),
});

const folderIdParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
});

const errorMessageSchema = t.Object({ message: t.String() });

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
      response: {
        201: folderSchema,
        400: errorMessageSchema,
        404: errorMessageSchema,
        409: errorMessageSchema,
      },
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
      response: {
        200: folderSchema,
        400: errorMessageSchema,
        404: errorMessageSchema,
        409: errorMessageSchema,
      },
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
        if (result.status === "NOT_EMPTY") {
          return status(409, {
            message: "Folder must be empty before deletion",
          });
        }

        return status(204, undefined);
      } catch (error) {
        console.error("Internal error: ", error);
        return status(500, { message: "Internal Server Error." });
      }
    },
    {
      params: folderIdParamsSchema,
      response: {
        204: t.Void(),
        404: errorMessageSchema,
        409: errorMessageSchema,
        500: errorMessageSchema,
      },
    },
  );
