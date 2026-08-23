"use client";

import { Badge } from "@/components/ui/Badge";
import { SceneBeatFields } from "@/components/create/scene/SceneBeatFields";
import { sceneVisualPreviewSrc } from "@/lib/sceneVisualImage";
import {
  formatTimecode,
  sceneStatusTone,
  sceneTimeRange,
  totalTimelineSeconds,
  type Scene,
} from "@/lib/videoProject";

export function TimelineChart({
  scenes,
  selectedId,
  busy,
  generateLocked,
  onSelect,
  onGenerateScript,
  onGenerateVisuals,
  onPreviewScript,
  onPreviewVisuals,
  scriptPlayingId,
}: {
  scenes: Scene[];
  selectedId: string | null;
  busy: string | null;
  generateLocked: boolean;
  onSelect: (id: string) => void;
  onGenerateScript: (id: string) => void;
  onGenerateVisuals: (id: string) => void;
  onPreviewScript: (id: string) => void;
  onPreviewVisuals: (id: string) => void;
  scriptPlayingId: string | null;
}) {
  const total = totalTimelineSeconds(scenes);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-accent">
            Production table
          </p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">
            Timeline · Section · Script · Visuals
          </p>
        </div>
        <p className="text-xs tabular-nums text-muted">
          {scenes.length} beats · {formatTimecode(total)} runtime
        </p>
      </div>

      <div className="no-scrollbar max-h-[min(70vh,44rem)] overflow-auto">
        <table className="w-full min-w-[64rem] border-collapse text-left">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border bg-surface-soft text-[11px] font-semibold uppercase tracking-wider text-muted">
              <th className="sticky left-0 z-20 w-12 bg-surface-soft px-3 py-3 text-center">#</th>
              <th className="w-32 px-4 py-3">Timeline</th>
              <th className="w-52 px-4 py-3">Section</th>
              <th className="min-w-[22rem] px-4 py-3">Final Script / Voiceover</th>
              <th className="min-w-[20rem] px-4 py-3">Visuals / Editing</th>
            </tr>
          </thead>
          <tbody>
            {scenes.map((scene, index) => {
              const range = sceneTimeRange(scenes, index);
              const selected = scene.id === selectedId;
              const duration = range.end - range.start;
              const zebra = index % 2 === 1;
              const rowBg = selected
                ? "bg-accent/10"
                : zebra
                  ? "bg-surface-soft/50"
                  : "bg-surface";
              const stickyBg = selected
                ? "bg-accent-soft"
                : zebra
                  ? "bg-surface-soft"
                  : "bg-surface";
              const scriptBusy = busy === `script:${scene.id}`;
              const visualsBusy = busy === `visuals:${scene.id}`;

              return (
                <tr
                  key={scene.id}
                  onClick={() => onSelect(scene.id)}
                  className={`cursor-pointer border-b border-border align-top last:border-b-0 ${rowBg} ${
                    selected ? "ring-1 ring-inset ring-accent/40" : "hover:bg-white/[0.03]"
                  }`}
                >
                  <td
                    className={`sticky left-0 z-10 px-3 py-4 text-center font-mono text-xs font-semibold tabular-nums text-muted ${stickyBg}`}
                  >
                    {index + 1}
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-mono text-xs font-semibold tabular-nums tracking-tight text-foreground">
                      {range.label}
                    </p>
                    <p className="mt-1 text-[11px] text-muted">{duration}s</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold leading-snug text-foreground">
                      {scene.sectionLabel}
                    </p>
                    <div className="mt-2">
                      <Badge tone={sceneStatusTone(scene.status)}>{scene.status}</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <SceneBeatFields
                      scene={scene}
                      column="script"
                      generating={scriptBusy}
                      generateDisabled={generateLocked && !scriptBusy}
                      previewing={scriptPlayingId === scene.id}
                      previewDisabled={!scene.finalScript.trim()}
                      onGenerate={() => onGenerateScript(scene.id)}
                      onPreview={() => onPreviewScript(scene.id)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <SceneBeatFields
                      scene={scene}
                      column="visuals"
                      generating={visualsBusy}
                      generateDisabled={generateLocked && !visualsBusy}
                      previewDisabled={!sceneVisualPreviewSrc(scene.visuals)}
                      onGenerate={() => onGenerateVisuals(scene.id)}
                      onPreview={() => onPreviewVisuals(scene.id)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
