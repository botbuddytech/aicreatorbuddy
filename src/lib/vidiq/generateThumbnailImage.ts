import "server-only";

import { uploadThumbnailImage } from "@/lib/storage/thumbnails";
import { withVidiqMcp } from "@/lib/vidiq/client";
import {
  readJobError,
  readJobId,
  readJobStatus,
  readThumbnailImage,
  sniffImageType,
  type ThumbnailImageSource,
} from "@/lib/vidiq/thumbnailJob";

const POLL_INTERVAL_MS = 3_000;
const POLL_ATTEMPTS = 40;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function materialize(source: ThumbnailImageSource): Promise<{ bytes: Buffer; contentType: string }> {
  if (source.kind === "bytes") {
    const contentType = sniffImageType(source.bytes, source.contentType);
    if (!contentType) throw new Error("vidIQ returned an image this app cannot store.");
    if (source.bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("Image must be under 5 MB.");
    return { bytes: source.bytes, contentType };
  }

  const response = await fetch(source.url, {
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error("vidIQ returned an image that could not be downloaded.");
  const length = Number(response.headers.get("content-length") || 0);
  if (length > MAX_IMAGE_BYTES) throw new Error("Image must be under 5 MB.");
  const bytes = Buffer.from(await response.arrayBuffer());
  const contentType = sniffImageType(bytes, response.headers.get("content-type"));
  if (!contentType) throw new Error("vidIQ returned an image this app cannot store.");
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("Image must be under 5 MB.");
  return { bytes, contentType };
}

export async function generateVidiqThumbnailImage(input: {
  userId: string;
  sessionId: string;
  channelId?: string;
  thumbnailId: string;
  prompt: string;
  title?: string;
  format: "long" | "short";
}): Promise<string> {
  const source = await withVidiqMcp(
    input.userId,
    {
      sessionId: input.sessionId,
      step: "THUMBNAIL",
      channelId: input.channelId,
      operation: "vidiq_generate_thumbnail",
      units: 22,
    },
    async (call) => {
      const started = await call("vidiq_generate_thumbnail", {
        userQuery: input.prompt.slice(0, 2000),
        ...(input.title ? { title: input.title.slice(0, 500) } : {}),
        orientation: input.format === "short" ? "portrait" : "landscape",
      });
      const immediate = readThumbnailImage(started);
      const immediateStatus = readJobStatus(started);
      if (immediate && immediateStatus !== "inprogress" && immediateStatus !== "pending") {
        return immediate;
      }
      const jobId = readJobId(started);
      if (!jobId) throw new Error("vidIQ did not start a thumbnail job.");

      for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
        await delay(POLL_INTERVAL_MS);
        const polled = await call("vidiq_job_poll", { mcpJobId: jobId });
        const status = readJobStatus(polled);
        if (status === "failed" || status === "expired") {
          throw new Error(readJobError(polled) || "vidIQ could not generate the thumbnail.");
        }
        if (status === "completed" || (!status && readThumbnailImage(polled))) {
          const image = readThumbnailImage(polled);
          if (!image) throw new Error("vidIQ finished without an image.");
          return image;
        }
      }
      throw new Error("vidIQ is still generating the thumbnail. Try again in a moment.");
    },
  );

  const image = await materialize(source);
  const url = await uploadThumbnailImage({
    sessionId: input.sessionId,
    thumbnailId: input.thumbnailId,
    bytes: image.bytes,
    contentType: image.contentType,
  });
  return `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
}
