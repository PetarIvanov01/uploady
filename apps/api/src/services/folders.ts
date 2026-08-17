import { t, type UnwrapSchema } from "elysia";
import {
  folderRepository,
  type FolderRecord,
} from "../repositories/folder.repository";

export const folderNameSchema = t.String({ maxLength: 255, minLength: 1 });

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

export type CreateFolderInput = UnwrapSchema<typeof createFolderBodySchema>;
export type UpdateFolderInput = UnwrapSchema<typeof updateFolderBodySchema>;

export interface FolderResult {
  createdAt: string;
  id: string;
  name: string;
  parentFolderId: string | null;
  updatedAt: string;
}

type SuccessfulFolderMutation = { folder: FolderResult; status: "SUCCESS" };

export type CreateFolderResult =
  | SuccessfulFolderMutation
  | { status: "INVALID_NAME" }
  | { status: "CYCLIC_PARENT" }
  | { status: "PARENT_NOT_FOUND" };

export type UpdateFolderResult =
  | { folder: FolderResult; status: "SUCCESS" }
  | { status: "INVALID_NAME" }
  | { status: "CYCLIC_PARENT" }
  | { status: "PARENT_NOT_FOUND" }
  | { status: "NOT_FOUND" };

export type DeleteFolderResult = { status: "DELETED" | "NOT_FOUND" };

// TODO: Replace this with the authenticated user's ID once auth is introduced.
const temporaryUserId = "9e9a548c-dced-4f30-958d-19d423b53028";

function toFolderResult(folder: FolderRecord): FolderResult {
  return {
    createdAt: folder.createdAt.toISOString(),
    id: folder.id,
    name: folder.name,
    parentFolderId: folder.parentFolderId,
    updatedAt: folder.updatedAt.toISOString(),
  };
}

function normalizeName(name: string) {
  const normalized = name.trim();
  return normalized ? normalized : null;
}

async function validateParent(
  folderId: string | null,
  parentFolderId: string,
): Promise<"CYCLIC_PARENT" | "PARENT_NOT_FOUND" | "VALID"> {
  const visited = new Set<string>();
  let currentId: string | null = parentFolderId;

  while (currentId) {
    if (currentId === folderId || visited.has(currentId)) {
      return "CYCLIC_PARENT";
    }
    visited.add(currentId);

    const current = await folderRepository.findById(currentId, temporaryUserId);
    if (!current) return "PARENT_NOT_FOUND";
    currentId = current.parentFolderId;
  }

  return "VALID";
}

export async function createFolder(
  input: CreateFolderInput,
): Promise<CreateFolderResult> {
  const name = normalizeName(input.name);
  if (!name) return { status: "INVALID_NAME" };

  const parentFolderId = input.parentFolderId ?? null;
  if (parentFolderId) {
    const parentStatus = await validateParent(null, parentFolderId);
    if (parentStatus !== "VALID") return { status: parentStatus };
  }

  const folder = await folderRepository.create({
    name,
    parentFolderId,
    userId: temporaryUserId,
  });

  return { folder: toFolderResult(folder), status: "SUCCESS" };
}

export async function updateFolder(
  id: string,
  input: UpdateFolderInput,
): Promise<UpdateFolderResult> {
  if (!(await folderRepository.findById(id, temporaryUserId))) {
    return { status: "NOT_FOUND" };
  }

  let name: string | undefined;
  if (input.name !== undefined) {
    name = normalizeName(input.name) ?? undefined;
    if (!name) return { status: "INVALID_NAME" };
  }

  if (input.parentFolderId) {
    const parentStatus = await validateParent(id, input.parentFolderId);
    if (parentStatus !== "VALID") return { status: parentStatus };
  }

  const folder = await folderRepository.update(id, temporaryUserId, {
    ...(name === undefined ? {} : { name }),
    ...(input.parentFolderId === undefined
      ? {}
      : { parentFolderId: input.parentFolderId }),
  });

  return folder
    ? { folder: toFolderResult(folder), status: "SUCCESS" }
    : { status: "NOT_FOUND" };
}

export async function deleteFolder(id: string): Promise<DeleteFolderResult> {
  return { status: await folderRepository.remove(id, temporaryUserId) };
}
