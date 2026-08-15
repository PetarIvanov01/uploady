import { useEffect, useRef } from "react";
import { SearchIcon } from "../VaultIcons";

type FileSearchProps = {
  onChange: (value: string) => void;
  value: string;
};

export function FileSearch({ onChange, value }: FileSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      const target = event.target;
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (event.key === "/" && !isEditable) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  return (
    <label className="relative block">
      <span className="sr-only">Search files by name</span>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink" />
      <input
        className="min-h-12 w-full rounded-sm border border-[#7c828a] bg-transparent py-2 pr-12 pl-11 text-[0.8125rem] text-ink outline-none transition-colors placeholder:text-muted focus:border-accent sm:text-sm"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search files by name..."
        ref={inputRef}
        type="search"
        value={value}
      />
      <kbd
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2.5 inline-flex h-7 min-w-7 -translate-y-1/2 items-center justify-center rounded-[3px] border border-border bg-paper px-1.5 text-xs text-muted"
      >
        /
      </kbd>
    </label>
  );
}
