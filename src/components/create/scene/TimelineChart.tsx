"use client";

import { Badge } from "@/components/ui/Badge";
import { SceneBeatFields } from "@/components/create/scene/SceneBeatFields";
import { MAX_PREVIEW_CHARS } from "@/features/elevenlabs/contract";
import { sceneVisualPreviewSrc } from "@/lib/sceneVisualImage";
import { spokenVoiceoverText } from "@/lib/sceneVoiceover";
import {
  formatTimecode,
  sceneStatusTone,
  sceneTimeRange,
  totalTimelineSeconds,
  type Scene,
} from "@/lib/videoProject";

export type VoiceLength = {
  provider: "qwen" | "elevenlabs";
  seconds: number;
};

export function TimelineChart({
  scenes,
  selectedId,
  busy,
  generateLocked,
  onSelect,
  onGenerateVisuals,
  onGenerateImage,
  onPreviewScript,
  onPreviewVisuals,
  scriptPlayingId,
  scriptLoadingId,
  elevenLabsPlayingId,
  elevenLabsLoadingId,
  elevenLabsDisabled,
  elevenLabsDurations,
  voiceLengths,
  onElevenLabsPreview,
}: {
  scenes: Scene[];
  selectedId: string | null;
  busy: string | null;
  generateLocked: boolean;
  onSelect: (id: string) => void;
  onGenerateVisuals: (id: string) => void;
  onGenerateImage: (id: string) => void;
  onPreviewScript: (id: string) => void;
  onPreviewVisuals: (id: string) => void;
  scriptPlayingId: string | null;
  scriptLoadingId: string | null;
  elevenLabsPlayingId: string | null;
  elevenLabsLoadingId: string | null;
  elevenLabsDisabled: boolean;
  elevenLabsDurations: Record<string, number>;
  voiceLengths: Record<string, VoiceLength>;
  onElevenLabsPreview: (id: string) => void;
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
              const clipBusy = busy === `visuals:${scene.id}:clip` || busy === "all-visuals";
              const imageBusy = busy === `visuals:${scene.id}:image` || busy === "all-visuals";

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
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] tabular-nums">
                      <span className="text-muted">{duration}s</span>
                      {voiceLengths[scene.id] ? (
                        <VoiceLengthMark
                          sceneSeconds={duration}
                          voice={voiceLengths[scene.id]}
                        />
                      ) : null}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold leading-snug text-foreground">
                      {scene.sectionLabel}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge tone={sceneStatusTone(scene.status)}>{scene.status}</Badge>
                      {scene.visuals.clipSource === "still" ? (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-accent">Still</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <SceneBeatFields
                      scene={scene}
                      column="script"
                      previewing={scriptPlayingId === scene.id}
                      previewLoading={scriptLoadingId === scene.id}
                      previewDisabled={!scene.finalScript.trim()}
                      onPreview={() => onPreviewScript(scene.id)}
                      elevenLabsPlaying={elevenLabsPlayingId === scene.id}
                      elevenLabsLoading={elevenLabsLoadingId === scene.id}
                      elevenLabsDisabled={
                        elevenLabsDisabled ||
                        !scene.finalScript.trim() ||
                        spokenVoiceoverText(scene.finalScript).length > MAX_PREVIEW_CHARS
                      }
                      elevenLabsVoiceSeconds={elevenLabsDurations[scene.id] ?? null}
                      voiceLength={voiceLengths[scene.id] ?? null}
                      onElevenLabsPreview={() => onElevenLabsPreview(scene.id)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <SceneBeatFields
                      scene={scene}
                      column="visuals"
                      generating={clipBusy}
                      generatingImage={imageBusy}
                      generateDisabled={generateLocked && !clipBusy}
                      generateImageDisabled={generateLocked && !imageBusy}
                      previewDisabled={!sceneVisualPreviewSrc(scene.visuals)}
                      onGenerate={() => onGenerateVisuals(scene.id)}
                      onGenerateImage={() => onGenerateImage(scene.id)}
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

function VoiceLengthMark({
  sceneSeconds,
  voice,
}: {
  sceneSeconds: number;
  voice: VoiceLength;
}) {
  const apart = Math.abs(Math.round(voice.seconds) - sceneSeconds) > 1;
  return (
    <span className="inline-flex items-center gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={voice.provider === "qwen" ? "/icons/providers/qwen.svg" : "/icons/providers/elevenlabs.svg"}
        alt=""
        className="h-3.5 w-3.5"
      />
      <span className={apart ? "font-semibold text-red-500" : "font-semibold text-foreground"}>
        {Math.round(voice.seconds)}s
      </span>
    </span>
  );
}
