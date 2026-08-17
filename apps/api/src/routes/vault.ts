import { Elysia, t } from "elysia";
import {
  retrieveFileVault,
  retrieveFolderVault,
  retrieveRootVault,
} from "../services/vault";

const breadcrumbSchema = t.Object({
  id: t.String({ format: "uuid" }),
  name: t.String(),
});

const fileStatusSchema = t.Union([
  t.Literal("UPLOADING"),
  t.Literal("READY"),
  t.Literal("FAILED"),
]);

const folderEntrySchema = t.Object({
  counts: t.Object({
    files: t.Integer({ minimum: 0 }),
    folders: t.Integer({ minimum: 0 }),
  }),
  createdAt: t.String(),
  id: t.String({ format: "uuid" }),
  kind: t.Literal("folder"),
  name: t.String(),
  updatedAt: t.String(),
});

const fileEntrySchema = t.Object({
  createdAt: t.String(),
  id: t.String({ format: "uuid" }),
  kind: t.Literal("file"),
  name: t.String(),
  size: t.Number({ minimum: 0 }),
  status: fileStatusSchema,
  type: t.String(),
  updatedAt: t.String(),
});

const vaultEntriesSchema = t.Array(
  t.Union([folderEntrySchema, fileEntrySchema]),
);

const rootVaultSchema = t.Object({
  breadcrumbs: t.Array(breadcrumbSchema, { maxItems: 0 }),
  entries: vaultEntriesSchema,
  location: t.Object({ kind: t.Literal("root") }),
});

const folderVaultSchema = t.Object({
  breadcrumbs: t.Array(breadcrumbSchema),
  entries: vaultEntriesSchema,
  location: t.Object({
    createdAt: t.String(),
    id: t.String({ format: "uuid" }),
    kind: t.Literal("folder"),
    name: t.String(),
    parentFolderId: t.Nullable(t.String({ format: "uuid" })),
    updatedAt: t.String(),
  }),
});

const fileVaultSchema = t.Object({
  breadcrumbs: t.Array(breadcrumbSchema),
  file: t.Object({
    createdAt: t.String(),
    id: t.String({ format: "uuid" }),
    name: t.String(),
    parentFolderId: t.Nullable(t.String({ format: "uuid" })),
    size: t.Number({ minimum: 0 }),
    status: fileStatusSchema,
    type: t.String(),
    updatedAt: t.String(),
  }),
});

const idParamsSchema = t.Object({
  id: t.String({ format: "uuid" }),
});

const notFoundSchema = t.Object({ message: t.String() });

export const vault = new Elysia({ prefix: "/vault" })
  .get("", retrieveRootVault, {
    response: { 200: rootVaultSchema },
  })
  .get(
    "/folders/:id",
    async ({ params, status }) => {
      const result = await retrieveFolderVault(params.id);
      return result ?? status(404, { message: "Folder not found" });
    },
    {
      params: idParamsSchema,
      response: { 200: folderVaultSchema, 404: notFoundSchema },
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
      response: { 200: fileVaultSchema, 404: notFoundSchema },
    },
  );
