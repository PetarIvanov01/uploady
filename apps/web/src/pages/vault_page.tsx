import {
  getRouteApi,
  Link,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { Button } from "../components/Button";
import { FolderView } from "../components/FolderView";
import { VaultLoadError } from "../lib/vault";

const rootVaultRoute = getRouteApi("/");
const folderVaultRoute = getRouteApi("/folder/$folderId");

export function RootVaultPage() {
  return <FolderView data={rootVaultRoute.useLoaderData()} />;
}

export function FolderVaultPage() {
  return <FolderView data={folderVaultRoute.useLoaderData()} />;
}

export function VaultPagePending() {
  return (
    <section
      aria-label="Loading vault"
      className="mx-auto w-full max-w-4xl animate-pulse pt-5 sm:pt-7"
      role="status"
    >
      <div className="h-11 w-2/5 bg-surface-filled" />
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3">
        <div className="h-[3.75rem] bg-surface-filled" />
        <div className="h-[3.75rem] bg-surface-filled" />
      </div>
      <div className="mt-5 h-11 bg-surface-filled" />
      <div className="mt-3 space-y-px">
        {[0, 1, 2, 3].map((row) => (
          <div className="h-16 bg-surface-filled/70" key={row} />
        ))}
      </div>
    </section>
  );
}

export function VaultPageError({ error }: ErrorComponentProps) {
  const router = useRouter();
  const message =
    error instanceof VaultLoadError
      ? error.message
      : "An unexpected error prevented the vault from loading.";

  return (
    <section className="mx-auto w-full max-w-4xl pt-5 sm:pt-7">
      <div className="border-y border-border py-8">
        <h1 className="m-0 text-base font-bold text-ink">
          Could not load vault
        </h1>
        <p className="mt-2 mb-0 text-xs text-destructive" role="alert">
          {message}
        </p>
        <Button className="mt-5" onClick={() => void router.invalidate()}>
          Retry
        </Button>
      </div>
    </section>
  );
}

export function FolderPageNotFound() {
  return (
    <section className="mx-auto w-full max-w-4xl pt-5 sm:pt-7">
      <div className="border-y border-border py-8">
        <h1 className="m-0 text-base font-bold text-ink">Folder not found</h1>
        <p className="mt-2 mb-0 text-xs text-muted">
          This folder may have been deleted or is no longer available.
        </p>
        <Link
          className="mt-5 inline-flex min-h-11 items-center text-xs text-accent transition-colors hover:text-accent-hover"
          to="/"
        >
          Back to root
        </Link>
      </div>
    </section>
  );
}
