export type FileItem = {
  date: string;
  name: string;
  size: string;
  type: string;
  kind?: "file" | "folder";
  selected?: boolean;
};

const files: FileItem[] = [
  {
    date: "Jun 10, 2026",
    name: "kafka-notes.md",
    size: "18 KB",
    type: "Markdown",
  },
  {
    date: "Jun 08, 2026",
    name: "system-design.png",
    size: "245 KB",
    type: "Image",
  },
  {
    date: "Jun 05, 2026",
    name: "architecture-diagram.svg",
    size: "86 KB",
    type: "SVG",
  },
  {
    date: "May 30, 2026",
    name: "meeting-notes-2026-05-30.txt",
    size: "6 KB",
    type: "Text",
  },
  {
    date: "May 28, 2026",
    name: "projects/",
    size: "—",
    type: "Folder",
    kind: "folder",
  },
  {
    date: "May 20, 2026",
    name: "books/",
    size: "—",
    type: "Folder",
    kind: "folder",
  },
  {
    date: "May 12, 2026",
    name: "resume.pdf",
    size: "312 KB",
    type: "PDF",
  },
  {
    date: "May 01, 2026",
    name: "ideas.md",
    size: "4 KB",
    type: "Markdown",
  },
];

type FileRowProps = {
  item: FileItem;
};

export function FileRow({ item }: FileRowProps) {
  const classNames = [
    "file-row",
    item.kind === "folder" ? "file-row--folder" : "",
    item.selected ? "file-row--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <tr className={classNames}>
      <td className="file-row__date">{item.date}</td>
      <td className="file-row__name">
        <a href={`#${item.name}`}>{item.name}</a>
      </td>
      <td className="file-row__size">{item.size}</td>
      <td className="file-row__type">{item.type}</td>
    </tr>
  );
}

export function FileList() {
  return (
    <section className="file-list" aria-labelledby="files-heading">
      <h2 className="sr-only" id="files-heading">
        Files and folders
      </h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Name</th>
            <th scope="col">Size</th>
            <th scope="col">Type</th>
          </tr>
        </thead>
        <tbody>
          {files.map((item) => (
            <FileRow item={item} key={item.name} />
          ))}
        </tbody>
      </table>
      <p className="file-list__count">{files.length} items total</p>
    </section>
  );
}
