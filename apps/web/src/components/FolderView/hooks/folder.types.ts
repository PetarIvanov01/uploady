export type FolderMetadata = {
  createdAt: string;
  id: string;
  name: string;
  parentFolderId: string | null;
  updatedAt: string;
};

export type CreateFolderInput = {
  name: string;
  parentFolderId?: string | null;
};

export type UpdateFolderInput =
  | { name: string; parentFolderId?: string | null }
  | { name?: string; parentFolderId: string | null };

export type FolderMutationOperation = "create" | "delete" | "update";

export type FolderMutationSuccess =
  | {
      folder: FolderMetadata;
      operation: "create" | "update";
    }
  | {
      folderId: string;
      operation: "delete";
    };
