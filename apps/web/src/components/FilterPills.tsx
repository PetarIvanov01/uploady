export type FileFilter = "all" | "files" | "folders";

type FilterPillsProps = {
  activeFilter: FileFilter;
  counts: Record<FileFilter, number>;
  onFilterChange: (filter: FileFilter) => void;
};

const filters: Array<{ label: string; value: FileFilter }> = [
  { label: "ALL", value: "all" },
  { label: "FILES", value: "files" },
  { label: "FOLDERS", value: "folders" },
];

export function FilterPills({
  activeFilter,
  counts,
  onFilterChange,
}: FilterPillsProps) {
  return (
    <div
      aria-label="File filters"
      className="grid grid-cols-3 gap-3"
      role="group"
    >
      {filters.map(({ label, value }) => {
        const isActive = activeFilter === value;

        return (
          <button
            aria-controls="vault-file-list"
            aria-pressed={isActive}
            className={`relative flex min-h-11 cursor-pointer items-center justify-center gap-3 border-0 bg-transparent px-1 text-[0.8125rem] transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-center after:transition-transform sm:gap-4 sm:text-sm ${
              isActive
                ? "text-ink after:scale-x-100 after:bg-accent"
                : "text-muted after:scale-x-0 after:bg-transparent hover:text-ink"
            }`}
            key={value}
            onClick={() => onFilterChange(value)}
            type="button"
          >
            <span>{label}</span>
            <span className="text-muted tabular-nums">{counts[value]}</span>
          </button>
        );
      })}
    </div>
  );
}
