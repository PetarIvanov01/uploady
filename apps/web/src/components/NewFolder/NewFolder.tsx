import { useState, type FormEvent } from "react";
import { Button } from "../Button";

type NewFolderProps = {
  onCancel: () => void;
  onCreate?: (name: string) => Promise<void> | void;
};

export function NewFolder({ onCancel, onCreate }: NewFolderProps) {
  const [folderName, setFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const normalizedName = folderName.trim();

  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!normalizedName || !onCreate) return;

    setIsCreating(true);

    try {
      await onCreate(normalizedName);
      setFolderName("");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <form
      className="border-y border-border py-4 sm:py-5"
      onSubmit={(event) => void createFolder(event)}
    >
      <label
        className="mb-2 block text-[0.75rem] leading-5 text-ink"
        htmlFor="folder-name"
      >
        Folder name
      </label>
      <input
        autoComplete="off"
        autoFocus
        className="min-h-12 w-full rounded-[4px] border border-[#7c828a] bg-transparent px-3.5 py-2 text-[0.875rem] text-ink outline-none transition-colors placeholder:text-faint focus:border-accent"
        disabled={isCreating}
        id="folder-name"
        maxLength={255}
        onChange={(event) => setFolderName(event.target.value)}
        placeholder="Untitled folder"
        type="text"
        value={folderName}
      />
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button disabled={isCreating} onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={!normalizedName || !onCreate || isCreating}
          title={
            onCreate
              ? undefined
              : "Folder creation will be enabled when the API endpoint is available."
          }
          type="submit"
          variant="primary"
        >
          {isCreating ? "Creating…" : "Create folder"}
        </Button>
      </div>
    </form>
  );
}
