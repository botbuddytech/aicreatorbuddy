"use client";

import { canRenderMediaOnWeb, renderMediaOnWeb } from "@remotion/web-renderer";
import { resolveClipUrls } from "@/lib/useClipUrl";
import { exportFileName, exportTitle } from "@/lib/exportFileName";
import type { VideoProject } from "@/lib/videoProject";
import {
  buildInputProps,
  FACELESS_COMPOSITION_ID,
  FacelessVideo,
  playerCompositionMeta,
} from "@/remotion";

export type ExportProgress = {
  /** 0–1 overall progress. */
  progress: number;
  encodedFrames: number;
  totalFrames: number;
};

export type ExportResult = {
  blob: Blob;
  fileName: string;
  mimeType: string;
};

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * Renders the draft with Remotion's browser encoder and downloads an MP4.
 * Requires WebCodecs (Chrome 94+, Firefox 130+, Safari 26+).
 */
export async function exportProjectWithRemotion(
  project: VideoProject,
  options?: {
    onProgress?: (progress: ExportProgress) => void;
    signal?: AbortSignal;
    download?: boolean;
    /** Spoken track for each scene id. The MP4 is silent when this is omitted. */
    voiceoverUrls?: Record<string, string>;
    /** Spoken length for each scene. A longer clip is cut here; a shorter clip holds its last frame. */
    voiceoverSeconds?: Record<string, number>;
  },
): Promise<ExportResult> {
  if (project.scenes.length === 0) {
    throw new Error("Add at least one timeline scene before exporting.");
  }

  const clipIds = project.scenes
    .map((scene) => scene.visuals.uploadedClipId)
    .filter((id): id is string => Boolean(id));
  const { urls, revoke } = await resolveClipUrls(clipIds);

  try {
    const inputProps = buildInputProps(
      project,
      urls,
      options?.voiceoverUrls,
      options?.voiceoverSeconds,
    );
    const meta = playerCompositionMeta(inputProps);
    const totalFrames = meta.durationInFrames;
    const title = exportTitle(project);
    const fileName = exportFileName({
      title,
      exportCount: project.editor.exportCount,
    });

    // H.264 rejects odd dimensions, so the check needs the real composition size.
    const capability = await canRenderMediaOnWeb({
      container: "mp4",
      videoCodec: "h264",
      audioCodec: "aac",
      muted: false,
      width: meta.compositionWidth,
      height: meta.compositionHeight,
    });
    if (!capability.canRender) {
      const blocking = capability.issues.filter((issue) => issue.severity === "error");
      throw new Error(
        blocking.map((issue) => issue.message).join(" ") ||
          "This browser cannot encode MP4 with WebCodecs. Try Chrome or Firefox.",
      );
    }

    options?.onProgress?.({
      progress: 0,
      encodedFrames: 0,
      totalFrames,
    });

    const licenseKey = process.env.NEXT_PUBLIC_REMOTION_LICENSE_KEY?.trim() || "free-license";

    const { getBlob } = await renderMediaOnWeb({
      licenseKey,
      composition: {
        id: FACELESS_COMPOSITION_ID,
        component: FacelessVideo,
        durationInFrames: meta.durationInFrames,
        fps: meta.fps,
        width: meta.compositionWidth,
        height: meta.compositionHeight,
        defaultProps: inputProps,
      },
      inputProps,
      container: "mp4",
      videoCodec: "h264",
      audioCodec: "aac",
      muted: false,
      signal: options?.signal,
      pageResponsiveness: "medium",
      metadata: {
        title,
        comment: "Exported from AI Creator Buddy",
      },
      onProgress: ({ progress, encodedFrames }) => {
        options?.onProgress?.({
          progress,
          encodedFrames,
          totalFrames,
        });
      },
    });

    const blob = await getBlob();
    if (options?.download !== false) {
      downloadBlob(blob, fileName);
    }

    return {
      blob,
      fileName,
      mimeType: blob.type || "video/mp4",
    };
  } finally {
    revoke();
  }
}
