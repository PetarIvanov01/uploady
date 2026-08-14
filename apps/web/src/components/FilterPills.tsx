import { Button } from "./Button";

const filters = ["All", "Files", "Folders"] as const;

export function FilterPills() {
  return (
    <div className="filters" aria-label="File filters">
      {filters.map((filter, index) => (
        <Button
          aria-pressed={index === 0}
          className="filter-pill"
          key={filter}
          variant={index === 0 ? "primary" : "secondary"}
        >
          {filter}
        </Button>
      ))}
    </div>
  );
}
