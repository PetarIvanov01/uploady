import { createFileRoute } from "@tanstack/react-router";
import { loadVaultContents } from "../lib/vault";
import {
  RootVaultPage,
  VaultPageError,
  VaultPagePending,
} from "../pages/vault_page";

export const Route = createFileRoute("/")({
  component: RootVaultPage,
  errorComponent: VaultPageError,
  loader: ({ abortController }) =>
    loadVaultContents(null, abortController.signal),
  pendingComponent: VaultPagePending,
  staleTime: 10_000,
});
