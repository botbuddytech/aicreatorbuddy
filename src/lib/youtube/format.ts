export function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/**
 * YouTube Data API v3 has no "draft" value. Studio drafts come back as
 * privacyStatus=private, so uploadStatus is what separates a draft from a
 * video that failed or is still processing.
 */
export function visibilityLabel(privacyStatus: string, uploadStatus?: string): string {
  switch (uploadStatus) {
    case "failed":
      return "Upload failed";
    case "rejected":
      return "Rejected";
    case "deleted":
      return "Deleted";
    case "uploaded":
      return "Processing";
  }

  switch (privacyStatus) {
    case "public":
      return "Public";
    case "unlisted":
      return "Unlisted";
    case "private":
      return "Private / Draft";
    default:
      return privacyStatus || "Unknown";
  }
}

export function channelInitials(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}
