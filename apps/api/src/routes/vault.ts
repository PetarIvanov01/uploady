import { Elysia, t } from "elysia";
import {
  retrieveFileVault,
  retrieveFolderVault,
  retrieveRootVault,
} from "../services/vault";

const idParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
});

export const vault = new Elysia({ prefix: "/vault" })
  .get("", retrieveRootVault)
  .get(
    "/folders/:id",
    async ({ params, status }) => {
      const result = await retrieveFolderVault(params.id);
      return result ?? status(404, { message: "Folder not found" });
    },
    {
      params: idParamsSchema,
    },
  )
  .get(
    "/files/:id",
    async ({ params, status }) => {
      const result = await retrieveFileVault(params.id);
      return result ?? status(404, { message: "File not found" });
    },
    {
      params: idParamsSchema,
    },
  );
