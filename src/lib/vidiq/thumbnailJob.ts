const IMAGE_URL_KEYS = ["imageUrl", "image_url", "thumbnailUrl", "download_url"];

export type ThumbnailImageSource =
  | { kind: "url"; url: string }
  | { kind: "bytes"; bytes: Buffer; contentType: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^https:\/\//i.test(trimmed)) return null;
  return trimmed;
}

function findImageUrl(value: unknown, depth = 0): string | null {
  if (depth > 5 || value == null) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findImageUrl(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const record = asRecord(value);
  if (!record) return null;
  for (const key of IMAGE_URL_KEYS) {
    const found = httpsUrl(record[key]);
    if (found) return found;
  }
  for (const [key, nested] of Object.entries(record)) {
    if (key === "mcpContent") continue;
    if (nested && typeof nested === "object") {
      const found = findImageUrl(nested, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function imageBytes(value: unknown): ThumbnailImageSource | null {
  const content = asRecord(value)?.mcpContent;
  if (!Array.isArray(content)) return null;
  for (const item of content) {
    const block = asRecord(item);
    if (!block || block.type !== "image" || typeof block.data !== "string") continue;
    const bytes = Buffer.from(block.data, "base64");
    if (bytes.byteLength === 0) continue;
    const header = typeof block.mimeType === "string" ? block.mimeType : "image/png";
    const contentType = sniffImageType(bytes, header);
    if (!contentType) continue;
    return { kind: "bytes", bytes, contentType };
  }
  return null;
}

export function readJobId(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return null;
  for (const key of ["mcpJobId", "jobId"]) {
    if (typeof record[key] === "string" && record[key].trim()) return record[key].trim();
  }
  const nested = asRecord(record.result);
  if (!nested) return null;
  for (const key of ["mcpJobId", "jobId"]) {
    if (typeof nested[key] === "string" && nested[key].trim()) return nested[key].trim();
  }
  return null;
}

export function readJobStatus(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return null;
  const status = record.status ?? asRecord(record.result)?.status;
  return typeof status === "string" ? status.trim().toLowerCase() : null;
}

export function readJobError(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return null;
  for (const key of ["error", "message", "errorCode"]) {
    if (typeof record[key] === "string" && record[key].trim()) return record[key].trim();
  }
  const nested = asRecord(record.result);
  if (!nested) return null;
  for (const key of ["error", "message", "errorCode"]) {
    if (typeof nested[key] === "string" && nested[key].trim()) return nested[key].trim();
  }
  return null;
}

export function readThumbnailImage(value: unknown): ThumbnailImageSource | null {
  const url = findImageUrl(value);
  if (url) return { kind: "url", url };
  return imageBytes(value);
}

export function sniffImageType(bytes: Buffer, header: string | null): string | null {
  const normalized = header?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (normalized === "image/jpg" || normalized === "image/jpeg") return "image/jpeg";
  if (normalized === "image/png" || normalized === "image/webp" || normalized === "image/gif") {
    return normalized;
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 6) {
    const magic = bytes.subarray(0, 6).toString("ascii");
    if (magic === "GIF87a" || magic === "GIF89a") return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}
