import { PlusIcon } from "./VaultIcons";

type UploadFileButtonProps = {
  onClick: () => void;
};

export function UploadFileButton({ onClick }: UploadFileButtonProps) {
  return (
    <button
      className="flex min-h-[3.875rem] w-full cursor-pointer items-center justify-center gap-2.5 rounded-[3px] border border-accent bg-transparent px-4 text-[0.875rem] text-accent transition-colors hover:bg-accent/[0.04] sm:text-[0.9375rem]"
      onClick={onClick}
      type="button"
    >
      <PlusIcon className="size-5 shrink-0" />
      <span>Upload file</span>
    </button>
  );
}
