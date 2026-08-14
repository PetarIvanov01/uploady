import { formatFileSize } from "../../utils/file-size";
import { Button } from "../Button";
import { useFileList, type FileMetadata } from "./useFileList";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

type FileRowProps = {
  item: FileMetadata;
};

export function FileRow({ item }: FileRowProps) {
  return (
    <tr className="file-row">
      <td className="file-row__date">{formatDate(item.createdAt)}</td>
      <td className="file-row__name">
        <a href={`#file-${item.id}`}>{item.name}</a>
      </td>
      <td className="file-row__size">{formatFileSize(item.size)}</td>
      <td className="file-row__type">{item.type || "Unknown"}</td>
    </tr>
  );
}

type FileListProps = {
  refreshKey?: number;
};

export function FileList({ refreshKey = 0 }: FileListProps) {
  const fileList = useFileList(refreshKey);
  const { files } = fileList;

  return (
    <section className="file-list" aria-labelledby="files-heading">
      <h2 className="sr-only" id="files-heading">
        Files
      </h2>

      {fileList.status === "loading" && files.length === 0 && (
        <p
          className="m-0 border-b border-border px-2 py-8 text-xs text-muted"
          role="status"
        >
          Loading files…
        </p>
      )}

      {fileList.status === "error" && files.length === 0 && (
        <div className="flex items-center justify-between gap-4 border-b border-border px-2 py-6">
          <p className="m-0 text-xs text-destructive" role="alert">
            {fileList.message}
          </p>
          <Button onClick={fileList.retry}>Retry</Button>
        </div>
      )}

      {fileList.status === "success" && files.length === 0 && (
        <div className="border-b border-border px-2 py-12 text-center">
          <h2 className="m-0 text-sm font-bold text-ink">No files yet</h2>
          <p className="mt-2 mb-0 text-xs text-muted">
            Upload your first file to start your vault.
          </p>
        </div>
      )}

      {files.length > 0 && (
        <>
          <table aria-busy={fileList.status === "loading"}>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Name</th>
                <th scope="col">Size</th>
                <th scope="col">Type</th>
              </tr>
            </thead>
            <tbody>
              {files.map((item) => (
                <FileRow item={item} key={item.id} />
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between gap-4">
            <p className="file-list__count">
              {files.length} {files.length === 1 ? "item" : "items"} total
            </p>
            {fileList.status === "error" && (
              <Button onClick={fileList.retry}>Retry</Button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
