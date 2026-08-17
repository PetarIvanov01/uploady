import {
  getRouteApi,
  Link,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { Button } from "../components/Button";
import { FileTypeIcon } from "../components/VaultIcons";
import { FileLoadError } from "../lib/files";
import { formatFileSize } from "../utils/file-size";

const fileRoute = getRouteApi("/file/$fileId");

export function FilePage() {
  const { file } = fileRoute.useLoaderData();

  return (
    <section className="mx-auto w-full max-w-4xl pt-5 sm:pt-7">
      {file.parentFolderId ? (
        <Link
          className="inline-flex min-h-11 items-center text-xs text-muted transition-colors hover:text-ink"
          params={{ folderId: file.parentFolderId }}
          to="/folder/$folderId"
        >
          ← Back to folder
        </Link>
      ) : (
        <Link
          className="inline-flex min-h-11 items-center text-xs text-muted transition-colors hover:text-ink"
          to="/"
        >
          ← Back to root
        </Link>
      )}

      <div className="mt-4 border-y border-border py-5 sm:py-7">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <FileTypeIcon
            className="mt-0.5 size-7 shrink-0 text-ink"
            fileName={file.name}
            type={file.type}
          />
          <div className="min-w-0">
            <h1 className="m-0 break-words text-base font-bold text-ink sm:text-lg">
              {file.name}
            </h1>
            <p className="mt-1 mb-0 text-xs text-muted">
              {formatFileSize(file.size)} · {file.type || "Unknown type"}
            </p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-3 text-xs">
          <dt className="text-muted">Status</dt>
          <dd className="m-0 text-ink">{file.status}</dd>
          <dt className="text-muted">Created</dt>
          <dd className="m-0 text-ink">
            {new Date(file.createdAt).toLocaleString()}
          </dd>
          <dt className="text-muted">File ID</dt>
          <dd className="m-0 break-all text-ink">{file.id}</dd>
        </dl>
      </div>
    </section>
  );
}

export function FilePagePending() {
  return (
    <section
      aria-label="Loading file"
      className="mx-auto w-full max-w-4xl animate-pulse pt-5 sm:pt-7"
      role="status"
    >
      <div className="h-11 w-28 bg-surface-filled" />
      <div className="mt-4 border-y border-border py-5 sm:py-7">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="size-7 shrink-0 bg-surface-filled" />
          <div className="w-full max-w-md space-y-2">
            <div className="h-5 w-3/4 bg-surface-filled" />
            <div className="h-3 w-1/2 bg-surface-filled" />
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <div className="h-3 w-2/5 bg-surface-filled" />
          <div className="h-3 w-3/5 bg-surface-filled" />
          <div className="h-3 w-4/5 bg-surface-filled" />
        </div>
      </div>
    </section>
  );
}

export function FilePageError({ error }: ErrorComponentProps) {
  const router = useRouter();
  const message =
    error instanceof FileLoadError
      ? error.message
      : "An unexpected error prevented this file from loading.";

  return (
    <section className="mx-auto w-full max-w-4xl pt-5 sm:pt-7">
      <div className="border-y border-border py-8">
        <h1 className="m-0 text-base font-bold text-ink">
          Could not load file
        </h1>
        <p className="mt-2 mb-0 text-xs text-destructive" role="alert">
          {message}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={() => void router.invalidate()}>Retry</Button>
          <Link
            className="inline-flex min-h-11 items-center px-2 text-xs text-muted transition-colors hover:text-ink"
            to="/"
          >
            Back to vault
          </Link>
        </div>
      </div>
    </section>
  );
}

export function FilePageNotFound() {
  return (
    <section className="mx-auto w-full max-w-4xl pt-5 sm:pt-7">
      <div className="border-y border-border py-8">
        <h1 className="m-0 text-base font-bold text-ink">File not found</h1>
        <p className="mt-2 mb-0 text-xs text-muted">
          This file may have been deleted or is no longer available.
        </p>
        <Link
          className="mt-5 inline-flex min-h-11 items-center text-xs text-accent transition-colors hover:text-accent-hover"
          to="/"
        >
          Back to vault
        </Link>
      </div>
    </section>
  );
}
