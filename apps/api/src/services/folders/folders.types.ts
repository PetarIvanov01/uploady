export interface CreateFolderInput {
  name: string;
  parentFolderId?: string | null;
}

export interface UpdateFolderInput {
  name?: string;
  parentFolderId?: string | null;
}

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
  | SuccessfulFolderMutation
  | { status: "INVALID_NAME" }
  | { status: "CYCLIC_PARENT" }
  | { status: "PARENT_NOT_FOUND" }
  | { status: "NOT_FOUND" };

export type DeleteFolderResult = { status: "DELETED" | "NOT_FOUND" };
