import {
  projectDisplayName,
  resolveProjectName,
  selectedTitle,
  type VideoProject,
} from "@/lib/videoProject";

export type ExportFileExtension = "mp4" | "md";

export type ExportFileNameInput = {
  /** Selected title, or the project name when no title is selected. */
  title: string;
  /** Successful exports already stored. This file is the next version. */
  exportCount: number;
  exportedAt?: Date;
  extension?: ExportFileExtension;
};

/** Version stamped on the next file. A project with no exports yet is v1. */
export function nextExportVersion(exportCount: number): number {
  const count = Number.isFinite(exportCount) ? Math.max(0, Math.floor(exportCount)) : 0;
  return count + 1;
}

export function exportTitle(project: VideoProject): string {
  return selectedTitle(project)?.text.trim() || resolveProjectName(project) || projectDisplayName(project);
}

/**
 * `{title}-v{n}-{YYYY-MM-DD}.{ext}`
 * The title is cleaned for a download name. Version comes from the stored export count.
 */
export function exportFileName({
  title,
  exportCount,
  exportedAt = new Date(),
  extension = "mp4",
}: ExportFileNameInput): string {
  const version = nextExportVersion(exportCount);
  const date = formatExportDate(exportedAt);
  return `${sanitizeExportTitle(title)}-v${version}-${date}.${extension}`;
}

export function sanitizeExportTitle(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^\w\s.-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 80);
  return cleaned || "video";
}

function formatExportDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
