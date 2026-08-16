import { createFileRoute } from "@tanstack/react-router";
import { FolderViewPage } from "../pages/folder_view_page";

type IndexSearch = {
  folder_id?: string;
};

export const Route = createFileRoute("/")({
  component: function IndexRoute() {
    const { folder_id: folderId } = Route.useSearch();
    return <FolderViewPage initialFolderId={folderId} />;
  },
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    folder_id:
      typeof search.folder_id === "string" && search.folder_id.length > 0
        ? search.folder_id
        : undefined,
  }),
});
