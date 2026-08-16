import { useMemo, useState, type FormEvent } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import type { VaultLoaderData } from "../../lib/vault";
import { formatFileSize } from "../../utils/file-size";
import { FileSearch } from "../FileList";
import { FileUpload } from "../FileUpload";
import { NewFolder } from "../NewFolder";
import { FolderPlusIcon, MoreIcon, UploadIcon } from "../VaultIcons";
import { DeleteFolderSheet } from "./DeleteFolderSheet";
import { FolderActionMenu } from "./FolderActionMenu";
import { FolderViewRow } from "./FolderViewRow";
import type { FolderViewEntry, FolderViewFolder } from "./folderView.types";
import { useFolderMutations, type FolderMetadata } from "./hooks";

const updatedFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
});
function formatUpdated(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : updatedFormatter.format(date);
}

function toFolderEntry(folder: FolderMetadata): FolderViewFolder {
  return {
    id: folder.id,
    kind: "folder",
    name: folder.name,
    updated: formatUpdated(folder.updatedAt),
  };
}

type FolderFormTarget = { parentFolderId: string | null; parentName: string };

type FolderViewProps = {
  data: VaultLoaderData;
};

export function FolderView({ data }: FolderViewProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [breadcrumbRenameName, setBreadcrumbRenameName] = useState("");
  const [folderFormTarget, setFolderFormTarget] =
    useState<FolderFormTarget | null>(null);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);

  const path = data.breadcrumbs;
  const currentFolderId = data.currentFolder?.id ?? null;
  const folderMutations = useFolderMutations();

  const folderEntries = useMemo(
    () => data.folders.map(toFolderEntry),
    [data.folders],
  );
  const currentFolderEntry = data.currentFolder
    ? toFolderEntry(data.currentFolder)
    : undefined;

  const fileEntries = useMemo<FolderViewEntry[]>(
    () =>
      data.files.map((file) => ({
        id: file.id,
        kind: "file" as const,
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type,
        updated: formatUpdated(file.createdAt),
      })),
    [data.files],
  );

  const entries = useMemo<FolderViewEntry[]>(
    () => [...folderEntries, ...fileEntries],
    [fileEntries, folderEntries],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const visibleEntries = entries.filter(
    (entry) =>
      normalizedQuery.length === 0 ||
      entry.name.toLowerCase().includes(normalizedQuery),
  );
  const deleteFolder =
    folderEntries.find((folder) => folder.id === deleteFolderId) ??
    (currentFolderEntry?.id === deleteFolderId
      ? currentFolderEntry
      : undefined);

  function closeTransientUi() {
    setFolderFormTarget(null);
    setMenuId(null);
    setRenamingId(null);
    setSelectedId(null);
    setDeleteFolderId(null);
    folderMutations.reset();
  }

  function openFolder(entry: FolderViewEntry) {
    if (entry.kind !== "folder") {
      setSelectedId(entry.id);
      setMenuId(null);
      return;
    }

    void navigate({
      params: { folderId: entry.id },
      to: "/folder/$folderId",
    });
    setQuery("");
    closeTransientUi();
  }

  function navigateToRoot() {
    void navigate({ to: "/" });
    setQuery("");
    closeTransientUi();
  }

  function navigateToBreadcrumb(index: number) {
    const targetFolder = path[index];
    void navigate({
      params: { folderId: targetFolder.id },
      to: "/folder/$folderId",
    });
    setQuery("");
    closeTransientUi();
  }

  async function createFolder(name: string) {
    if (!folderFormTarget) return false;

    const createdFolder = await folderMutations.createFolder({
      name,
      parentFolderId: folderFormTarget.parentFolderId,
    });

    if (!createdFolder) return false;

    await router.invalidate();
    setFolderFormTarget(null);
    setMenuId(null);
    return true;
  }

  async function saveRename(id: string, name: string) {
    const updatedFolder = await folderMutations.updateFolder(id, { name });
    if (!updatedFolder) return;

    await router.invalidate();
    setRenamingId(null);
  }

  function saveBreadcrumbRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = breadcrumbRenameName.trim();
    if (currentFolderId && name) void saveRename(currentFolderId, name);
  }

  async function deleteSelectedFolder(folder: FolderViewFolder) {
    const isCurrentFolder = folder.id === currentFolderId;
    const parentFolderId = data.currentFolder?.parentFolderId;
    const deleted = await folderMutations.deleteFolder(folder.id);
    if (!deleted) return;

    setDeleteFolderId(null);
    setMenuId(null);
    setSelectedId(null);

    if (isCurrentFolder) {
      if (parentFolderId) {
        await navigate({
          params: { folderId: parentFolderId },
          to: "/folder/$folderId",
        });
      } else {
        await navigate({ to: "/" });
      }
    } else {
      await router.invalidate();
    }
  }

  const currentLocationName = path.at(-1)?.name ?? "Root";
  const mutationErrors = {
    create:
      folderMutations.status === "error" &&
      folderMutations.operation === "create"
        ? folderMutations.message
        : undefined,
    delete:
      folderMutations.status === "error" &&
      folderMutations.operation === "delete"
        ? folderMutations.message
        : undefined,
    update:
      folderMutations.status === "error" &&
      folderMutations.operation === "update"
        ? folderMutations.message
        : undefined,
  };

  return (
    <section className="mx-auto w-full max-w-4xl pt-5 sm:pt-7">
      <div className="relative">
        <nav
          aria-label="Breadcrumb"
          className="flex min-h-11 items-center gap-2 overflow-x-auto whitespace-nowrap text-[0.8125rem] text-muted sm:gap-3 sm:text-sm"
        >
          <button
            aria-current={path.length === 0 ? "page" : undefined}
            aria-label="Root"
            className={`cursor-pointer border-0 bg-transparent p-0 transition-colors hover:text-ink ${
              path.length === 0 ? "text-accent" : "text-muted"
            }`}
            onClick={navigateToRoot}
            title="Root"
            type="button"
          >
            /
          </button>
          {path.map((folder, index) => {
            const isCurrent = index === path.length - 1;

            return (
              <span className="contents" key={folder.id}>
                {index > 0 && <span aria-hidden="true">/</span>}
                {isCurrent && renamingId === folder.id ? (
                  <form
                    className="flex items-center gap-2"
                    onSubmit={saveBreadcrumbRename}
                  >
                    <label className="sr-only" htmlFor={`rename-${folder.id}`}>
                      Rename {folder.name}
                    </label>
                    <input
                      autoFocus
                      className="h-9 min-w-32 rounded-[3px] border border-accent bg-paper px-2 text-[0.8125rem] text-ink outline-none"
                      id={`rename-${folder.id}`}
                      maxLength={255}
                      onChange={(event) =>
                        setBreadcrumbRenameName(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Escape") setRenamingId(null);
                      }}
                      value={breadcrumbRenameName}
                    />
                    <button
                      className="cursor-pointer border-0 bg-transparent p-0 text-muted hover:text-ink"
                      onClick={() => setRenamingId(null)}
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
                  </form>
                ) : isCurrent ? (
                  <span className="flex items-center gap-1">
                    <span aria-current="page" className="text-accent">
                      {folder.name}
                    </span>
                    <button
                      aria-expanded={menuId === folder.id}
                      aria-haspopup="menu"
                      aria-label={`Actions for ${folder.name}`}
                      className="flex size-9 cursor-pointer items-center justify-center rounded-[4px] border border-transparent bg-transparent text-ink transition-colors hover:bg-surface-filled"
                      onClick={() =>
                        setMenuId((current) =>
                          current === folder.id ? null : folder.id,
                        )
                      }
                      type="button"
                    >
                      <MoreIcon className="size-5" />
                    </button>
                  </span>
                ) : (
                  <button
                    className="cursor-pointer border-0 bg-transparent p-0 text-muted transition-colors hover:text-ink"
                    onClick={() => navigateToBreadcrumb(index)}
                    type="button"
                  >
                    {folder.name}
                  </button>
                )}
              </span>
            );
          })}
        </nav>

        {currentFolderEntry && menuId === currentFolderEntry.id && (
          <FolderActionMenu
            folderName={currentFolderEntry.name}
            onDelete={() => {
              folderMutations.reset();
              setDeleteFolderId(currentFolderEntry.id);
              setMenuId(null);
            }}
            onNewFolderInside={() => {
              folderMutations.reset();
              setFolderFormTarget({
                parentFolderId: currentFolderEntry.id,
                parentName: currentFolderEntry.name,
              });
              setMenuId(null);
            }}
            onOpen={() => setMenuId(null)}
            onRename={() => {
              folderMutations.reset();
              setBreadcrumbRenameName(currentFolderEntry.name);
              setRenamingId(currentFolderEntry.id);
              setMenuId(null);
            }}
          />
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3">
        {currentFolderId === null ? (
          <FileUpload onUploadSuccess={() => void router.invalidate()} />
        ) : (
          <button
            className="flex min-h-[3.75rem] cursor-not-allowed items-center justify-center gap-2.5 rounded-[4px] border border-border bg-surface-muted/60 px-3 text-[0.8125rem] text-faint sm:text-sm"
            disabled
            title="Nested file uploads require parent-folder support in the upload API."
            type="button"
          >
            <UploadIcon className="size-5 shrink-0" />
            <span>Upload file</span>
          </button>
        )}
        <button
          aria-expanded={folderFormTarget?.parentFolderId === currentFolderId}
          className="flex min-h-[3.75rem] cursor-pointer items-center justify-center gap-2.5 rounded-[4px] border border-border-strong bg-transparent px-3 text-[0.8125rem] text-muted transition-colors hover:border-ink hover:text-ink sm:text-sm"
          onClick={() => {
            folderMutations.reset();
            setFolderFormTarget({
              parentFolderId: currentFolderId,
              parentName: currentLocationName,
            });
          }}
          type="button"
        >
          <FolderPlusIcon className="size-5 shrink-0" />
          <span>New folder</span>
        </button>
      </div>

      {folderFormTarget && (
        <div
          aria-label={`Create a folder inside ${folderFormTarget.parentName}`}
          className="mt-3"
        >
          <NewFolder
            errorMessage={mutationErrors.create}
            onCancel={() => {
              setFolderFormTarget(null);
              folderMutations.reset();
            }}
            onCreate={createFolder}
          />
        </div>
      )}

      <div className="mt-4 sm:mt-5">
        <FileSearch
          onChange={setQuery}
          placeholder="Search this folder..."
          value={query}
        />
      </div>

      {mutationErrors.update && (
        <div className="mt-3 space-y-1 text-xs text-destructive" role="alert">
          {mutationErrors.update && <p>{mutationErrors.update}</p>}
        </div>
      )}

      <div className="mt-3">
        <div className="grid grid-cols-[1fr_3.25rem_2.75rem] items-center border-b border-border px-1 pb-2 text-[0.625rem] text-muted min-[380px]:grid-cols-[1.5rem_minmax(0,1fr)_3.25rem_2.75rem] sm:px-2 sm:text-[0.6875rem]">
          <span className="min-[380px]:col-start-1 min-[380px]:col-end-3">
            NAME
          </span>
          <span className="hidden text-right min-[380px]:block">UPDATED</span>
        </div>

        {visibleEntries.length > 0 ? (
          <ul
            aria-busy={folderMutations.status === "loading"}
            className="m-0 list-none p-0"
          >
            {visibleEntries.map((entry) => (
              <FolderViewRow
                entry={entry}
                isMenuOpen={entry.kind === "folder" && menuId === entry.id}
                isRenaming={renamingId === entry.id}
                isSelected={selectedId === entry.id}
                key={`${entry.kind}-${entry.id}`}
                onCancelRename={() => {
                  setRenamingId(null);
                  folderMutations.reset();
                }}
                onDelete={() => {
                  if (entry.kind === "folder") {
                    folderMutations.reset();
                    setSelectedId(entry.id);
                    setDeleteFolderId(entry.id);
                  }
                }}
                onNewFolderInside={() => {
                  if (entry.kind === "folder") {
                    folderMutations.reset();
                    setFolderFormTarget({
                      parentFolderId: entry.id,
                      parentName: entry.name,
                    });
                    setMenuId(null);
                  }
                }}
                onOpen={() => openFolder(entry)}
                onRename={() => {
                  folderMutations.reset();
                  setSelectedId(entry.id);
                  setRenamingId(entry.id);
                  setMenuId(null);
                }}
                onRenameSave={(name) => void saveRename(entry.id, name)}
                onToggleMenu={() => {
                  setSelectedId(entry.id);
                  setMenuId((current) =>
                    entry.kind === "folder" && current !== entry.id
                      ? entry.id
                      : null,
                  );
                }}
              />
            ))}
          </ul>
        ) : (
          <div className="border-b border-border py-12 text-center">
            <h2 className="m-0 text-sm font-bold text-ink">
              {normalizedQuery ? "No matching items" : "This folder is empty"}
            </h2>
            <p className="mt-2 mb-0 text-xs text-muted">
              {normalizedQuery
                ? "Try another search."
                : "Create a folder here to get started."}
            </p>
          </div>
        )}
      </div>

      {deleteFolder && (
        <DeleteFolderSheet
          errorMessage={mutationErrors.delete}
          folder={deleteFolder}
          isDeleting={
            folderMutations.status === "loading" &&
            folderMutations.operation === "delete"
          }
          onCancel={() => {
            setDeleteFolderId(null);
            folderMutations.reset();
          }}
          onDelete={() => void deleteSelectedFolder(deleteFolder)}
        />
      )}
    </section>
  );
}
