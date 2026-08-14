import { Button } from "./Button";

export function EmptyState() {
  return (
    <section className="empty-state" aria-labelledby="empty-state-title">
      <h2 id="empty-state-title">No files yet</h2>
      <p>Upload your first file to start your vault.</p>
      <Button variant="primary">Upload</Button>
    </section>
  );
}
