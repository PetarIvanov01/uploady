import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const baseIconProps = {
  "aria-hidden": true,
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.5,
  viewBox: "0 0 24 24",
} as const;

export function PlusIcon(props: IconProps) {
  return (
    <svg {...baseIconProps} {...props}>
      <path d="M12 4v16M4 12h16" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...baseIconProps} {...props}>
      <circle cx="10.75" cy="10.75" r="6.75" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <svg {...baseIconProps} {...props}>
      <circle cx="5" cy="12" fill="currentColor" r="1" stroke="none" />
      <circle cx="12" cy="12" fill="currentColor" r="1" stroke="none" />
      <circle cx="19" cy="12" fill="currentColor" r="1" stroke="none" />
    </svg>
  );
}

type FileTypeIconProps = IconProps & {
  fileName: string;
  type: string;
};

export function FileTypeIcon({ fileName, type, ...props }: FileTypeIconProps) {
  const normalizedType = type.toLowerCase();
  const isFolder =
    normalizedType === "folder" ||
    normalizedType === "inode/directory" ||
    fileName.endsWith("/");

  if (isFolder) {
    return (
      <svg {...baseIconProps} {...props}>
        <path d="M3 6.5h6l2 2h10v10.75A1.75 1.75 0 0 1 19.25 21H4.75A1.75 1.75 0 0 1 3 19.25z" />
      </svg>
    );
  }

  if (normalizedType.startsWith("image/")) {
    return (
      <svg {...baseIconProps} {...props}>
        <path d="M5 2.75h10l4 4v14.5H5z" />
        <path d="M15 2.75v4h4M7.5 17l3-3 2 2 2.25-2.25L17 16" />
        <circle cx="9" cy="10" r="1" />
      </svg>
    );
  }

  if (
    normalizedType.includes("gzip") ||
    normalizedType.includes("zip") ||
    normalizedType.includes("compressed")
  ) {
    return (
      <svg {...baseIconProps} {...props}>
        <path d="M5 2.75h10l4 4v14.5H5z" />
        <path d="M15 2.75v4h4M11 5h2M11 8h2M11 11h2M10.5 14h3v3h-3z" />
      </svg>
    );
  }

  if (normalizedType.startsWith("text/")) {
    return (
      <svg {...baseIconProps} {...props}>
        <path d="M5 2.75h10l4 4v14.5H5z" />
        <path d="M15 2.75v4h4M8.5 11h7M8.5 14h7M8.5 17h4.5" />
      </svg>
    );
  }

  return (
    <svg {...baseIconProps} {...props}>
      <path d="M5 2.75h10l4 4v14.5H5z" />
      <path d="M15 2.75v4h4" />
    </svg>
  );
}
