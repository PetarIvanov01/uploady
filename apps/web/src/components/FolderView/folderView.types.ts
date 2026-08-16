export type FolderViewFolder = {
  fileCount?: number;
  folderCount?: number;
  id: string;
  kind: "folder";
  name: string;
  updated: string;
};

export type FolderViewFile = {
  id: string;
  kind: "file";
  name: string;
  size: string;
  type: string;
  updated: string;
};

export type FolderViewEntry = FolderViewFolder | FolderViewFile;
