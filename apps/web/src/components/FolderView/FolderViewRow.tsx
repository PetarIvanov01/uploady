import { useEffect, useState, type ChangeEvent } from "react";
import { Link } from "@tanstack/react-router";
import { FileTypeIcon, MoreIcon } from "../VaultIcons";
import { FolderActionMenu } from "./FolderActionMenu";
import type { FolderViewEntry } from "./folderView.types";

type FolderViewRowProps = {
  entry: FolderViewEntry;
  isMenuOpen: boolean;
  isRenaming: boolean;
  isSelected: boolean;
  onCancelRename: () => void;
  onDelete: () => void;
  onNewFolderInside: () => void;
  onOpen: () => void;
  onRename: () => void;
  onRenameSave: (name: string) => void;
  onToggleMenu: () => void;
};

function folderMetadata(entry: Extract<FolderViewEntry, { kind: "folder" }>) {
  if (
    typeof entry.fileCount !== "number" ||
    typeof entry.folderCount !== "number"
  ) {
    return `Folder · ${entry.updated}`;
  }

  const fileLabel = entry.fileCount === 1 ? "file" : "files";
  const folderLabel = entry.folderCount === 1 ? "folder" : "folders";

  return entry.folderCount > 0
    ? `${entry.fileCount} ${fileLabel} · ${entry.folderCount} ${folderLabel}`
    : `${entry.fileCount} ${fileLabel} · ${entry.updated}`;
}

export function FolderViewRow({
  entry,
  isMenuOpen,
  isRenaming,
  isSelected,
  onCancelRename,
  onDelete,
  onNewFolderInside,
  onOpen,
  onRename,
  onRenameSave,
  onToggleMenu,
}: FolderViewRowProps) {
  const [name, setName] = useState(entry.name);

  useEffect(() => setName(entry.name), [entry.name]);

  function saveName(event: ChangeEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim();
    if (normalizedName) onRenameSave(normalizedName);
  }

  const metadata =
    entry.kind === "folder"
      ? folderMetadata(entry)
      : `${entry.size} · ${entry.updated}`;

  return (
    <li
      className={`relative grid min-h-14 grid-cols-[1.5rem_minmax(0,1fr)_2.75rem] items-center gap-3 border-b border-border px-1 transition-colors min-[380px]:grid-cols-[1.5rem_minmax(0,1fr)_3.25rem_2.75rem] sm:min-h-16 sm:px-2 ${
        isSelected
          ? "rounded-[5px] bg-surface-filled"
          : "hover:bg-surface-muted/60"
      }`}
    >
      <FileTypeIcon
        className="size-6 text-ink"
        fileName={entry.kind === "folder" ? `${entry.name}/` : entry.name}
        type={entry.kind === "folder" ? "folder" : entry.type}
      />

      {isRenaming ? (
        <form className="min-w-0 py-2" onSubmit={saveName}>
          <label className="sr-only" htmlFor={`rename-${entry.id}`}>
            Rename {entry.name}
          </label>
          <input
            autoFocus
            className="h-9 w-full rounded-[3px] border border-accent bg-paper px-2 text-[0.8125rem] text-ink outline-none"
            id={`rename-${entry.id}`}
            maxLength={255}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") onCancelRename();
            }}
            value={name}
          />
          <div className="mt-1 flex gap-3 text-[0.6875rem]">
            <button
              className="cursor-pointer border-0 bg-transparent p-0 text-muted hover:text-ink"
              onClick={onCancelRename}
              type="button"
            >
              Cancel
            </button>
            <button
              className="cursor-pointer border-0 bg-transparent p-0 text-accent hover:text-accent-hover"
              type="submit"
            >
              Save
            </button>
          </div>
        </form>
      ) : entry.kind === "file" ? (
        <Link
          className="group min-w-0 py-1.5 text-left"
          params={{ fileId: entry.id }}
          to="/file/$fileId"
        >
          <span
            className="block truncate text-[0.875rem] leading-5 text-ink transition-colors group-hover:text-accent sm:text-[0.9375rem]"
            title={entry.name}
          >
            {entry.name}
          </span>
          <span className="mt-0.5 block truncate text-[0.6875rem] leading-5 text-muted sm:text-xs">
            {metadata}
          </span>
        </Link>
      ) : (
        <button
          className="min-w-0 cursor-pointer border-0 bg-transparent py-1.5 text-left"
          onClick={onOpen}
          type="button"
        >
          <span
            className="block truncate text-[0.875rem] leading-5 text-ink sm:text-[0.9375rem]"
            title={entry.name}
          >
            {entry.name}
            {entry.kind === "folder" ? "/" : ""}
          </span>
          <span className="mt-0.5 block truncate text-[0.6875rem] leading-5 text-muted sm:text-xs">
            {metadata}
          </span>
        </button>
      )}

      <span className="hidden text-right text-[0.6875rem] text-muted tabular-nums min-[380px]:block sm:text-xs">
        {entry.updated}
      </span>

      <button
        aria-expanded={isMenuOpen}
        aria-haspopup={entry.kind === "folder" ? "menu" : undefined}
        aria-label={`Actions for ${entry.name}`}
        className={`flex size-11 cursor-pointer items-center justify-center rounded-[4px] border bg-transparent text-ink transition-colors ${
          isMenuOpen
            ? "border-[#737980] bg-paper"
            : "border-transparent hover:bg-surface-filled"
        }`}
        onClick={onToggleMenu}
        type="button"
      >
        <MoreIcon className="size-6" />
      </button>

      {entry.kind === "folder" && isMenuOpen && (
        <FolderActionMenu
          folderName={entry.name}
          onDelete={onDelete}
          onNewFolderInside={onNewFolderInside}
          onOpen={onOpen}
          onRename={onRename}
        />
      )}
    </li>
  );
}
