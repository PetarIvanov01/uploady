import { createFileRoute } from "@tanstack/react-router";
import { loadVaultContents } from "../../lib/vault";
import {
  FolderPageNotFound,
  FolderVaultPage,
  VaultPageError,
  VaultPagePending,
} from "../../pages/vault_page";

export const Route = createFileRoute("/folder/$folderId")({
  component: FolderVaultPage,
  errorComponent: VaultPageError,
  loader: ({ abortController, params }) =>
    loadVaultContents(params.folderId, abortController.signal),
  notFoundComponent: FolderPageNotFound,
  pendingComponent: VaultPagePending,
  staleTime: 10_000,
});
