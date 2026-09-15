"use client";

import { sceneVisualImageUrl } from "@/lib/sceneVisualImage";

/**
 * Uploaded clips still need a plain image for the chart thumb and the cut
 * preview, which both render the scene src in an <img>.
 */
const MAX_WIDTH = 640;
const JPEG_QUALITY = 0.7;

export type ClipProbe = {
  poster: string;
  durationSeconds: number | null;
};

function drawToDataUrl(
  source: CanvasImageSource,
  width: number,
  height: number,
): string | null {
  if (!width || !height) return null;
  const scale = Math.min(1, MAX_WIDTH / width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  try {
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } catch {
    return null;
  }
}

function posterFromVideo(file: File): Promise<ClipProbe> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;

    const finish = (probe: ClipProbe) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      resolve(probe);
    };

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    video.onloadeddata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : null;
      const frame = drawToDataUrl(video, video.videoWidth, video.videoHeight);
      finish({
        poster: frame ?? sceneVisualImageUrl(file.name),
        durationSeconds: duration,
      });
    };
    video.onloadedmetadata = () => {
      // Seek past the first frame; many encodes open on a black frame.
      try {
        video.currentTime = Math.min(0.1, (video.duration || 1) / 2);
      } catch {
        /* onloadeddata still fires */
      }
    };
    video.onerror = () => finish({ poster: sceneVisualImageUrl(file.name), durationSeconds: null });
    window.setTimeout(
      () => finish({ poster: sceneVisualImageUrl(file.name), durationSeconds: null }),
      5000,
    );

    video.src = url;
  });
}

function posterFromImage(file: File): Promise<ClipProbe> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    const finish = (poster: string) => {
      URL.revokeObjectURL(url);
      resolve({ poster, durationSeconds: null });
    };

    image.onload = () => {
      const frame = drawToDataUrl(image, image.naturalWidth, image.naturalHeight);
      finish(frame ?? sceneVisualImageUrl(file.name));
    };
    image.onerror = () => finish(sceneVisualImageUrl(file.name));
    image.src = url;
  });
}

/**
 * Duration-only probe for clips already in IndexedDB, for drafts uploaded
 * before source length was recorded. The caller owns the object URL.
 */
export function measureVideoSeconds(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    let settled = false;

    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      video.removeAttribute("src");
      resolve(value);
    };

    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () =>
      finish(Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null);
    video.onerror = () => finish(null);
    window.setTimeout(() => finish(null), 5000);

    video.src = url;
  });
}

export function clipKindFor(file: File): "image" | "video" {
  return file.type.startsWith("video") ? "video" : "image";
}

export function buildClipPoster(file: File): Promise<ClipProbe> {
  return clipKindFor(file) === "video" ? posterFromVideo(file) : posterFromImage(file);
}
