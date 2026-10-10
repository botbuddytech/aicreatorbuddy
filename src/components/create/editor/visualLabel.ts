"use client";

import type { Scene } from "@/lib/videoProject";

export function visualLabel(scene: Scene): string {
  if (scene.visuals.uploadedClipName?.trim()) return scene.visuals.uploadedClipName.trim();
  const description = scene.visuals.description.trim();
  if (description) return description;
  return scene.sectionLabel;
}
