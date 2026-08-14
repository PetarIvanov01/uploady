import { useState } from "react";
import { FileList } from "../components/FileList";
import { FileUpload } from "../components/FileUpload";
import { FilterPills } from "../components/FilterPills";

export function HomePage() {
  const [fileListVersion, setFileListVersion] = useState(0);

  return (
    <>
      <section className="hero" aria-labelledby="page-title">
        <div className="hero__copy">
          <h1 id="page-title">Personal Storage Vault</h1>
          <p>
            A private, minimal place for your files. Upload, organize, and
            access what matters—on your terms.
          </p>
        </div>
        <FileUpload
          onUploadSuccess={() => setFileListVersion((version) => version + 1)}
        />
      </section>

      <FilterPills />
      <FileList refreshKey={fileListVersion} />
    </>
  );
}
