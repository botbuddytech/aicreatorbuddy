"use client";

import { mockStockClips } from "@/lib/mockAi";
import type { Scene } from "@/lib/videoProject";

export function clipFor(scene: Scene) {
  return mockStockClips.find((clip) => clip.id === scene.visuals.stockFootageId);
}

export function visualLabel(scene: Scene): string {
  const clip = clipFor(scene);
  const description = scene.visuals.description.trim();
  return clip?.title || description || scene.sectionLabel;
}
