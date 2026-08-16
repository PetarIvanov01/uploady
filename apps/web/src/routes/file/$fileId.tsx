import { createFileRoute } from "@tanstack/react-router";

type IndexSearch = {
  folder_id?: string;
};

export const Route = createFileRoute("/file/$fileId")({
  component: function IndexRoute() {
    const { fileId } = Route.useParams();
    return <div>This is the File Page {fileId}</div>;
  },
  validateSearch: (search: Record<string, unknown>): IndexSearch => ({
    folder_id:
      typeof search.folder_id === "string" && search.folder_id.length > 0
        ? search.folder_id
        : undefined,
  }),
});
