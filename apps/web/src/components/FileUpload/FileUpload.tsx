import { UploadFileButton } from "../UploadFileButton";
import { SelectedFilesCard } from "./SelectedFilesCard";
import { useFileUpload } from "./useFileUpload";

type FileUploadProps = {
  onUploadSuccess?: () => void;
};

export function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const {
    inputRef,
    isWorking,
    openFilePicker,
    selectedFiles,
    selectFiles,
    uploadSelectedFiles,
    uploadState,
  } = useFileUpload({ onUploadSuccess });

  const hasSelectedFiles = selectedFiles.length > 0;

  return (
    <div
      className={`w-full min-w-0 ${hasSelectedFiles ? "col-span-full" : ""}`}
    >
      <input
        aria-label="Choose files to upload"
        className="sr-only"
        disabled={isWorking}
        multiple
        onChange={selectFiles}
        ref={inputRef}
        type="file"
      />

      {hasSelectedFiles ? (
        <SelectedFilesCard
          files={selectedFiles}
          isWorking={isWorking}
          onReplace={openFilePicker}
          onUpload={uploadSelectedFiles}
          uploadState={uploadState}
        />
      ) : (
        <UploadFileButton onClick={openFilePicker} />
      )}
    </div>
  );
}
