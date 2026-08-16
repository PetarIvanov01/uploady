import { useFolder } from "./useFolder";
import { useFolderMutations } from "./useFolderMutations";
import { useFolders } from "./useFolders";

export function useFolderManagement(parentFolderId: string | null = null) {
  const currentFolder = useFolder(parentFolderId);
  const folderList = useFolders(parentFolderId);
  const mutations = useFolderMutations({
    onSuccess: (result) => {
      folderList.refresh();

      if (
        result.operation === "update" &&
        result.folder.id === parentFolderId
      ) {
        currentFolder.refresh();
      }
    },
  });

  return {
    createFolder: mutations.createFolder,
    currentFolder: currentFolder.folder,
    currentFolderError:
      currentFolder.status === "error" ? currentFolder.message : undefined,
    currentFolderPath: currentFolder.path,
    currentFolderStatus: currentFolder.status,
    deleteFolder: mutations.deleteFolder,
    folders: folderList.folders,
    isMutating: mutations.isWorking,
    listError: folderList.status === "error" ? folderList.message : undefined,
    listStatus: folderList.status,
    mutationError: mutations.status === "error" ? mutations.message : undefined,
    mutationOperation:
      mutations.status === "idle" ? undefined : mutations.operation,
    mutationStatus: mutations.status,
    refreshCurrentFolder: currentFolder.refresh,
    refreshFolders: folderList.refresh,
    resetMutation: mutations.reset,
    retryFolders: folderList.retry,
    updateFolder: mutations.updateFolder,
  };
}
