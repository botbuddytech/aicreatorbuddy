import "server-only";

const MAX_BYTES = 5 * 1024 * 1024;
const MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

/** vidIQ will not fetch our storage host, so the scorer needs the image bytes. */
export async function thumbnailImageDataUri(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl.split("?")[0], {
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error("Could not read the thumbnail image.");
  const header = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  const mime = header === "image/jpg" ? "image/jpeg" : header || "image/png";
  if (!MIME_TYPES.has(mime)) throw new Error("vidIQ can only score a JPEG, PNG, WebP, or GIF.");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) {
    throw new Error("Image must be under 5 MB.");
  }
  return `data:${mime};base64,${bytes.toString("base64")}`;
}
