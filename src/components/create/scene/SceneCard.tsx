"use client";

import { Badge } from "@/components/ui/Badge";
import { sceneStatusTone, type Scene } from "@/lib/videoProject";

export function SceneCard({
  scene,
  selected,
  onSelect,
}: {
  scene: Scene;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-44 shrink-0 rounded-xl border px-3 py-3 text-left transition-colors ${
        selected ? "border-accent/50 bg-accent/10" : "border-border bg-surface hover:bg-white/5"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
          {String(scene.order + 1).padStart(2, "0")}
        </span>
        <Badge tone={sceneStatusTone(scene.status)}>{scene.status}</Badge>
      </div>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">{scene.sectionLabel}</p>
      <p className="mt-1 line-clamp-2 text-xs text-muted">
        {scene.finalScript || "Empty scene"}
      </p>
    </button>
  );
}
