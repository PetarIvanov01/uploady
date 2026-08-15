import { useMemo, useState } from "react";
import {
  FileList,
  FileSearch,
  isFolder,
  useFileList,
} from "../components/FileList";
import { FileUpload } from "../components/FileUpload";
import { FilterPills, type FileFilter } from "../components/FilterPills";
import { NewFolder } from "../components/NewFolder";
import { PlusIcon } from "../components/VaultIcons";

export function HomePage() {
  const [fileListVersion, setFileListVersion] = useState(0);
  const [activeFilter, setActiveFilter] = useState<FileFilter>("all");
  const [isFolderFormOpen, setIsFolderFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileList = useFileList(fileListVersion);

  const counts = useMemo(() => {
    const folderCount = fileList.files.filter(isFolder).length;

    return {
      all: fileList.files.length,
      files: fileList.files.length - folderCount,
      folders: folderCount,
    };
  }, [fileList.files]);

  const visibleFiles = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return fileList.files.filter((item) => {
      const folder = isFolder(item);
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "folders" && folder) ||
        (activeFilter === "files" && !folder);
      const matchesSearch =
        normalizedQuery.length === 0 ||
        item.name.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, fileList.files, searchQuery]);

  return (
    <section className="mx-auto w-full max-w-4xl pt-5 sm:pt-7">
      <div>
        <div className="grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-[minmax(0,1fr)_minmax(8.75rem,auto)] sm:gap-3">
          <FileUpload
            onUploadSuccess={() => setFileListVersion((version) => version + 1)}
          />
          <button
            aria-expanded={isFolderFormOpen}
            className={`flex min-h-[3.875rem] cursor-pointer items-center justify-center gap-2.5 rounded-[3px] border px-4 text-[0.875rem] transition-colors sm:text-[0.9375rem] ${
              isFolderFormOpen
                ? "border-ink bg-surface-filled text-ink"
                : "border-border-strong bg-transparent text-muted hover:border-ink hover:text-ink"
            }`}
            onClick={() => setIsFolderFormOpen((isOpen) => !isOpen)}
            type="button"
          >
            <PlusIcon className="size-5 shrink-0" />
            <span>New folder</span>
          </button>
        </div>

        {isFolderFormOpen && (
          <div className="mt-3">
            <NewFolder onCancel={() => setIsFolderFormOpen(false)} />
          </div>
        )}
      </div>

      <div className="mt-4 sm:mt-5">
        <FilterPills
          activeFilter={activeFilter}
          counts={counts}
          onFilterChange={setActiveFilter}
        />
      </div>

      <div className="mt-4 sm:mt-5">
        <FileSearch onChange={setSearchQuery} value={searchQuery} />
      </div>

      <div className="mt-2 sm:mt-3">
        <FileList
          files={visibleFiles}
          hasActiveSearchOrFilter={
            activeFilter !== "all" || searchQuery.trim().length > 0
          }
          message={fileList.status === "error" ? fileList.message : undefined}
          onRetry={fileList.retry}
          status={fileList.status}
        />
      </div>
    </section>
  );
}
