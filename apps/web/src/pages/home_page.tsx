import { FileList } from "../components/FileList";
import { FileUpload } from "../components/FileUpload";
import { FilterPills } from "../components/FilterPills";

export function HomePage() {
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
        <FileUpload />
      </section>

      <FilterPills />
      <FileList />
    </>
  );
}
