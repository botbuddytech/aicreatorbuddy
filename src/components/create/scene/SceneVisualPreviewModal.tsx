"use client";

import { useEffect, useRef, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { sceneVisualPreviewSrc } from "@/lib/sceneVisualImage";
import { useClipUrl } from "@/lib/useClipUrl";
import type { Scene } from "@/lib/videoProject";

export function SceneVisualPreviewModal({
  open,
  scene,
  onClose,
}: {
  open: boolean;
  scene: Scene | null;
  onClose: () => void;
}) {
  const src = scene ? sceneVisualPreviewSrc(scene.visuals) : null;
  const caption = scene?.visuals.description.trim() || scene?.sectionLabel || "Scene visual";
  const clipUrl = useClipUrl(scene?.visuals.uploadedClipId ?? null);
  const isVideo = scene?.visuals.uploadedClipKind === "video" && Boolean(clipUrl);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const volume = Math.max(0, Math.min(1, (scene?.editing.volume ?? 100) / 100));
  const trimStart = scene?.editing.trimStartSeconds ?? 0;

  useEffect(() => {
    if (!open) {
      setAudioMuted(false);
      return;
    }
    if (!isVideo) return;
    const node = videoRef.current;
    if (!node) return;
    node.muted = false;
    node.volume = volume;
    const seek = () => {
      if (trimStart > 0 && Number.isFinite(node.duration)) {
        node.currentTime = Math.min(trimStart, Math.max(0, node.duration - 0.05));
      }
    };
    seek();
    // Preview click is a user gesture, but the element mounts a tick later —
    // try unmuted play; if the browser blocks it, surface Unmute.
    void node.play().catch(() => {
      node.muted = true;
      setAudioMuted(true);
      void node.play().catch(() => undefined);
    });
  }, [open, isVideo, clipUrl, volume, trimStart]);

  function unmuteAndPlay() {
    const node = videoRef.current;
    if (!node) return;
    node.muted = false;
    node.volume = volume;
    setAudioMuted(false);
    void node.play().catch(() => undefined);
  }

  return (
    <Modal
      open={open}
      title="Visual preview"
      subtitle={scene?.sectionLabel}
      size="lg"
      onClose={onClose}
    >
      {isVideo || src ? (
        <div className="space-y-3">
          {isVideo ? (
            <>
              <video
                key={clipUrl}
                ref={videoRef}
                src={clipUrl ?? undefined}
                poster={src ?? undefined}
                controls
                playsInline
                className="aspect-video w-full rounded-xl border border-border bg-black object-contain"
                onVolumeChange={(event) => {
                  setAudioMuted(event.currentTarget.muted);
                }}
                onLoadedMetadata={(event) => {
                  const node = event.currentTarget;
                  node.volume = volume;
                  if (trimStart > 0 && Number.isFinite(node.duration)) {
                    node.currentTime = Math.min(trimStart, Math.max(0, node.duration - 0.05));
                  }
                }}
              />
              {audioMuted ? (
                <div className="flex flex-wrap items-center gap-2">
                  <ActionButton size="sm" onClick={unmuteAndPlay}>
                    Unmute
                  </ActionButton>
                  <p className="text-xs text-muted">
                    Browser blocked autoplay sound — click Unmute
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src ?? undefined}
              alt={caption}
              className="aspect-video w-full rounded-xl border border-border object-cover"
            />
          )}
          {scene?.visuals.uploadedClipName ? (
            <p className="text-xs text-muted">{scene.visuals.uploadedClipName}</p>
          ) : null}
          {scene?.visuals.description.trim() ? (
            <p className="text-sm leading-relaxed text-muted">{scene.visuals.description}</p>
          ) : null}
        </div>
      ) : (
        <EmptyState
          title="Generate a visual first"
          description="Create an image for this beat, or upload your own clip, then preview it here."
        />
      )}
    </Modal>
  );
}
