import { FolderView } from "../components/FolderView";

type FolderViewPageProps = {
  initialFolderId?: string;
};

export function FolderViewPage({ initialFolderId }: FolderViewPageProps) {
  return <FolderView initialFolderId={initialFolderId} />;
}
