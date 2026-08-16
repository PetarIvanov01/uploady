import { createFileRoute } from "@tanstack/react-router";
import { getFile } from "../../lib/files";
import {
  FilePage,
  FilePageError,
  FilePageNotFound,
  FilePagePending,
} from "../../pages/file_page";

export const Route = createFileRoute("/file/$fileId")({
  component: FilePage,
  errorComponent: FilePageError,
  loader: ({ abortController, params }) =>
    getFile(params.fileId, abortController.signal),
  notFoundComponent: FilePageNotFound,
  pendingComponent: FilePagePending,
  staleTime: 10_000,
});
