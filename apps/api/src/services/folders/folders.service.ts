import { folderRepository } from "../../repositories/folder.repository";
import { toFolderDto } from "./folders.mapper";
import type {
  CreateFolderInput,
  CreateFolderResult,
  DeleteFolderResult,
  UpdateFolderInput,
  UpdateFolderResult,
} from "./folders.types";

// TODO: Replace this with the authenticated user's ID once auth is introduced.
const temporaryUserId = "9e9a548c-dced-4f30-958d-19d423b53028";

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

  return { folder: toFolderDto(folder), status: "SUCCESS" };
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
    ? { folder: toFolderDto(folder), status: "SUCCESS" }
    : { status: "NOT_FOUND" };
}

export async function deleteFolder(id: string): Promise<DeleteFolderResult> {
  return { status: await folderRepository.remove(id, temporaryUserId) };
}
