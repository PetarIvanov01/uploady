import { t } from "elysia";

const folderNameSchema = t.String({ maxLength: 255, minLength: 1 });

export const createFolderBodySchema = t.Object({
  name: folderNameSchema,
  parentFolderId: t.Optional(t.Nullable(t.String({ format: "uuid" }))),
});

export const updateFolderBodySchema = t.Partial(
  t.Object({
    name: folderNameSchema,
    parentFolderId: t.Nullable(t.String({ format: "uuid" })),
  }),
  { minProperties: 1 },
);
