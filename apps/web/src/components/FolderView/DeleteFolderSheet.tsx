import type { FolderViewFolder } from "./folderView.types";

type DeleteFolderSheetProps = {
  errorMessage?: string;
  folder: FolderViewFolder;
  isDeleting?: boolean;
  onCancel: () => void;
  onDelete: () => void;
};

export function DeleteFolderSheet({
  errorMessage,
  folder,
  isDeleting = false,
  onCancel,
  onDelete,
}: DeleteFolderSheetProps) {
  return (
    <section
      aria-describedby="delete-folder-description"
      aria-labelledby="delete-folder-title"
      aria-modal="true"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[36rem] rounded-t-[1.75rem] border border-b-0 border-ink bg-paper px-5 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-7"
      role="dialog"
    >
      <div
        aria-hidden="true"
        className="mx-auto mb-2 h-1 w-14 rounded-full bg-faint"
      />
      <h2
        className="m-0 text-[1.125rem] leading-7 font-normal tracking-[-0.02em] text-ink sm:text-xl"
        id="delete-folder-title"
      >
        Delete {folder.name}?
      </h2>
      <div
        className="mt-1 text-[0.75rem] leading-5 text-muted sm:text-[0.8125rem]"
        id="delete-folder-description"
      >
        <p className="m-0">
          This folder must be empty before it can be deleted.
        </p>
        <p className="m-0">Files or folders inside it will prevent deletion.</p>
      </div>
      {errorMessage && (
        <p className="mt-2 mb-0 text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 border-t border-border">
        <button
          className="min-h-14 cursor-pointer border-0 border-r border-border bg-transparent px-3 text-[0.8125rem] text-ink hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-faint sm:text-sm"
          disabled={isDeleting}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="min-h-14 cursor-pointer border-0 bg-transparent px-3 text-[0.8125rem] text-destructive hover:bg-destructive/[0.05] disabled:cursor-not-allowed disabled:text-faint sm:text-sm"
          disabled={isDeleting}
          onClick={onDelete}
          type="button"
        >
          {isDeleting ? "Deleting…" : "Delete folder"}
        </button>
      </div>
    </section>
  );
}
