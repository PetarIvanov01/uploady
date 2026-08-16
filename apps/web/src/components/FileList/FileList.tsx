import { formatFileSize } from "../../utils/file-size";
import { Button } from "../Button";
import { FileTypeIcon, MoreIcon } from "../VaultIcons";
import { isFolder, type FileMetadata } from "./useFileList";

function formatDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : date.toISOString().slice(0, 10);
}

type FileRowProps = {
  item: FileMetadata;
};

export function FileRow({ item }: FileRowProps) {
  const folder = isFolder(item);
  const itemHref = folder
    ? `/folder/${encodeURIComponent(item.id)}`
    : `/file/${encodeURIComponent(item.id)}`;

  return (
    <li
      className="grid min-h-18.5 grid-cols-[1.5rem_minmax(0,1fr)_2.75rem] items-center gap-3 border-b border-border transition-colors hover:bg-surface-muted/70 sm:min-h-20 sm:grid-cols-[1.625rem_minmax(0,1fr)_2.75rem] sm:gap-4 sm:px-2"
      id={`file-${item.id}`}
    >
      <FileTypeIcon
        className="size-6 text-ink sm:size-6.5"
        fileName={item.name}
        type={item.type}
      />

      <a className="group min-w-0 py-3" href={itemHref}>
        <span
          className="block truncate text-[0.875rem] leading-5 text-ink transition-colors group-hover:text-accent sm:text-[0.9375rem]"
          title={item.name}
        >
          {item.name}
        </span>
        <span className="mt-0.5 flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap text-[0.6875rem] leading-5 text-muted sm:gap-2.5 sm:text-xs">
          {folder ? (
            <>
              <span className="shrink-0">Folder</span>
              {typeof item.itemCount === "number" && (
                <>
                  <span aria-hidden="true">•</span>
                  <span className="shrink-0">
                    {item.itemCount} {item.itemCount === 1 ? "item" : "items"}
                  </span>
                </>
              )}
            </>
          ) : (
            <>
              <span className="shrink-0">{formatFileSize(item.size)}</span>
              <span aria-hidden="true">•</span>
              <span className="truncate">{item.type || "Unknown"}</span>
            </>
          )}
          <span aria-hidden="true">•</span>
          <span className="shrink-0">{formatDate(item.createdAt)}</span>
        </span>
      </a>

      <details className="group/actions relative">
        <summary className="flex size-11 cursor-pointer list-none items-center justify-center rounded-sm text-ink transition-colors marker:hidden hover:bg-surface-filled [&::-webkit-details-marker]:hidden">
          <span className="sr-only">Actions for {item.name}</span>
          <MoreIcon className="size-6" />
        </summary>
        <div className="absolute top-10 right-0 z-20 w-36 rounded-[3px] border border-border-strong bg-paper p-1 shadow-[0_8px_24px_rgb(23_23_23/0.10)]">
          <a
            className="flex min-h-10 items-center rounded-sm px-3 text-xs text-ink hover:bg-surface-muted"
            href={itemHref}
          >
            View details
          </a>
          <button
            className="flex min-h-10 w-full cursor-pointer items-center rounded-sm border-0 bg-transparent px-3 text-xs text-ink hover:bg-surface-muted"
            onClick={() => void navigator.clipboard.writeText(item.name)}
            type="button"
          >
            Copy name
          </button>
        </div>
      </details>
    </li>
  );
}

type FileListProps = {
  files: FileMetadata[];
  hasActiveSearchOrFilter?: boolean;
  message?: string;
  onRetry: () => void;
  status: "loading" | "success" | "error";
};

function LoadingRows() {
  return (
    <div aria-label="Loading files" className="animate-pulse" role="status">
      {[0, 1, 2, 3].map((row) => (
        <div
          className="grid min-h-[4.625rem] grid-cols-[1.5rem_minmax(0,1fr)_2.75rem] items-center gap-3 border-b border-border"
          key={row}
        >
          <span className="size-5 bg-surface-filled" />
          <span className="space-y-2">
            <span className="block h-3 w-3/5 bg-surface-filled" />
            <span className="block h-2.5 w-4/5 bg-surface-filled" />
          </span>
        </div>
      ))}
    </div>
  );
}

export function FileList({
  files,
  hasActiveSearchOrFilter = false,
  message,
  onRetry,
  status,
}: FileListProps) {
  if (status === "loading" && files.length === 0) {
    return <LoadingRows />;
  }

  if (status === "error" && files.length === 0) {
    return (
      <div className="flex min-h-32 items-center justify-between gap-4 border-b border-border py-6">
        <p className="m-0 text-xs text-destructive" role="alert">
          {message}
        </p>
        <Button onClick={onRetry}>Retry</Button>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="border-b border-border py-12 text-center">
        <h2 className="m-0 text-sm font-bold text-ink">
          {hasActiveSearchOrFilter ? "No matching files" : "No files yet"}
        </h2>
        <p className="mt-2 mb-0 text-xs text-muted">
          {hasActiveSearchOrFilter
            ? "Try another search or filter."
            : "Upload your first file to start your vault."}
        </p>
      </div>
    );
  }

  return (
    <>
      <ul
        aria-busy={status === "loading"}
        className="m-0 list-none p-0"
        id="vault-file-list"
      >
        {files.map((item) => (
          <FileRow item={item} key={item.id} />
        ))}
      </ul>
      {status === "error" && (
        <div className="flex items-center justify-between gap-4 py-4">
          <p className="m-0 text-xs text-destructive" role="alert">
            {message}
          </p>
          <Button onClick={onRetry}>Retry</Button>
        </div>
      )}
    </>
  );
}
