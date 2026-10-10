import type { VideoProject } from "@/lib/videoProject";

export type UploadPrivacy = "private" | "unlisted" | "public";

export type PublishVideoInput = {
  project: VideoProject;
  file: { blob: Blob; fileName: string; mimeType: string };
  channelId: string;
  title: string;
  description: string;
  tags: string[];
  privacy: UploadPrivacy;
  publishAtIso: string | null;
  thumbnailUrl?: string | null;
  onPhase?: (phase: "starting" | "uploading" | "finishing") => void;
  /** 0–1 while the MP4 is sent to Google's upload URL */
  onUploadProgress?: (ratio: number) => void;
};

async function putVideoThroughAppTransfer(
  transferId: string,
  blob: Blob,
  mimeType: string,
  onProgress?: (ratio: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `/api/youtube/upload/transfer?transferId=${encodeURIComponent(transferId)}`,
    );
    xhr.setRequestHeader("Content-Type", mimeType || "video/mp4");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded / event.total);
      }
    };
    xhr.onload = () => {
      let body: { videoId?: string; error?: string } | null = null;
      try {
        body = xhr.responseText ? (JSON.parse(xhr.responseText) as { videoId?: string; error?: string }) : null;
      } catch {
        body = null;
      }
      if (xhr.status >= 200 && xhr.status < 300 && body?.videoId) {
        resolve(body.videoId);
        return;
      }
      reject(new Error(body?.error || `Upload failed (${xhr.status}).`));
    };
    xhr.onerror = () =>
      reject(
        new Error(
          "Could not reach the upload server. Check your connection and try again (large files need a stable network).",
        ),
      );
    xhr.onabort = () => reject(new Error("YouTube upload was cancelled."));
    xhr.send(blob);
  });
}

export type PublishVideoResult = {
  url: string;
  videoId: string;
  thumbnailWarning: string | null;
};

export async function thumbnailPayload(
  url: string | undefined | null,
): Promise<{ thumbnailBase64: string; thumbnailType: string } | null> {
  if (!url) return null;
  if (url.startsWith("data:")) {
    const [meta, data] = url.split(",");
    return { thumbnailBase64: data ?? "", thumbnailType: meta.match(/data:(.*?);/)?.[1] ?? "image/png" };
  }
  const response = await fetch(url);
  if (!response.ok) return null;
  const blob = await response.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return { thumbnailBase64: btoa(binary), thumbnailType: blob.type || "image/jpeg" };
}

export function projectPublishTitle(project: VideoProject): string {
  return project.titles.find((item) => item.id === project.selectedTitleId)?.text.trim() || project.name;
}

export function projectThumbnailUrl(project: VideoProject): string | null {
  const chosen = project.thumbnails.find((item) => item.id === project.selectedThumbnailId);
  const url = (chosen?.customUrl ?? project.thumbnails.find((item) => item.customUrl)?.customUrl)?.trim();
  return url || null;
}

export async function publishVideoToYoutube(input: PublishVideoInput): Promise<PublishVideoResult> {
  const privacy = input.publishAtIso ? "private" : input.privacy;
  input.onPhase?.("starting");
  const started = await fetch("/api/youtube/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: input.project.id,
      channelId: input.channelId,
      title: input.title,
      description: input.description,
      tags: input.tags,
      privacy,
      publishAt: input.publishAtIso,
      contentLength: input.file.blob.size,
      contentType: input.file.mimeType || "video/mp4",
    }),
  });
  const startBody = (await started.json()) as { transferId?: string; channelId?: string; error?: string };
  if (!started.ok || !startBody.transferId) {
    throw new Error(startBody.error || "YouTube did not start the upload.");
  }
  const channelId = startBody.channelId || input.channelId;
  input.onPhase?.("uploading");
  const videoId = await putVideoThroughAppTransfer(
    startBody.transferId,
    input.file.blob,
    input.file.mimeType || "video/mp4",
    input.onUploadProgress,
  );
  input.onPhase?.("finishing");
  const thumb = await thumbnailPayload(input.thumbnailUrl);
  const finished = await fetch("/api/youtube/upload/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      sessionId: input.project.id,
      channelId,
      videoId,
      ...thumb,
    }),
  });
  const finishBody = (await finished.json()) as {
    url?: string;
    error?: string;
    thumbnailWarning?: string | null;
  };
  if (!finished.ok || !finishBody.url) throw new Error(finishBody.error || "Could not finish the upload.");
  return {
    url: finishBody.url,
    videoId,
    thumbnailWarning: finishBody.thumbnailWarning ?? null,
  };
}
