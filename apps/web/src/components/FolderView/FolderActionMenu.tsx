import {
  FileTypeIcon,
  FolderPlusIcon,
  PencilIcon,
  TrashIcon,
} from "../VaultIcons";

type FolderActionMenuProps = {
  folderName: string;
  onDelete: () => void;
  onNewFolderInside: () => void;
  onOpen: () => void;
  onRename: () => void;
};

const actionClassName =
  "flex min-h-10 w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-3 text-left text-[0.75rem] text-ink transition-colors hover:bg-surface-muted sm:text-[0.8125rem]";

export function FolderActionMenu({
  folderName,
  onDelete,
  onNewFolderInside,
  onOpen,
  onRename,
}: FolderActionMenuProps) {
  return (
    <div
      aria-label={`Actions for ${folderName}`}
      className="absolute top-[3.2rem] right-0 z-30 w-[13.25rem] rounded-[4px] border border-[#5f646b] bg-paper p-1 shadow-[0_8px_18px_rgb(23_23_23/0.08)]"
      role="menu"
    >
      <button
        className={actionClassName}
        onClick={onOpen}
        role="menuitem"
        type="button"
      >
        <FileTypeIcon
          className="size-5 shrink-0"
          fileName={`${folderName}/`}
          type="folder"
        />
        <span>Open</span>
      </button>
      <button
        className={actionClassName}
        onClick={onNewFolderInside}
        role="menuitem"
        type="button"
      >
        <FolderPlusIcon className="size-5 shrink-0" />
        <span>New folder inside</span>
      </button>
      <button
        className={actionClassName}
        onClick={onRename}
        role="menuitem"
        type="button"
      >
        <PencilIcon className="size-5 shrink-0" />
        <span>Rename</span>
      </button>
      <div className="my-1 border-t border-border" />
      <button
        className={`${actionClassName} text-destructive hover:bg-destructive/[0.05]`}
        onClick={onDelete}
        role="menuitem"
        type="button"
      >
        <TrashIcon className="size-5 shrink-0" />
        <span>Delete</span>
      </button>
    </div>
  );
}
