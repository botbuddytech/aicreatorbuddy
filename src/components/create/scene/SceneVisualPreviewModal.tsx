"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { sceneVisualPreviewSrc } from "@/lib/sceneVisualImage";
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

  return (
    <Modal
      open={open}
      title="Visual preview"
      subtitle={scene?.sectionLabel}
      size="lg"
      onClose={onClose}
    >
      {src ? (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={caption}
            className="aspect-video w-full rounded-xl border border-border object-cover"
          />
          {scene?.visuals.description.trim() ? (
            <p className="text-sm leading-relaxed text-muted">{scene.visuals.description}</p>
          ) : null}
        </div>
      ) : (
        <EmptyState
          title="Generate a visual first"
          description="Create an image for this beat, then preview the still here."
        />
      )}
    </Modal>
  );
}
