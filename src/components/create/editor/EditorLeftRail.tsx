"use client";

import { ActionButton } from "@/components/ui/ActionButton";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useVoiceoverPreview } from "@/components/create/useVoiceoverPreview";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { mockMusicTracks, mockStockClips } from "@/lib/mockAi";
import {
  OVERLAY_POSITIONS,
  TRANSITION_OPTIONS,
  type OverlayPosition,
  type Scene,
  type TransitionId,
} from "@/lib/videoProject";

export type EditorRailId = "assets" | "text" | "transitions" | "audio";

const RAILS: { id: EditorRailId; label: string; icon: string }[] = [
  { id: "assets", label: "Assets", icon: "M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" },
  { id: "text", label: "Text", icon: "M5 5h14v3h-5v11h-4V8H5V5z" },
  { id: "transitions", label: "Transitions", icon: "M7 4l5 8-5 8h3l5-8-5-8H7zm7 0l5 8-5 8h3l5-8-5-8h-3z" },
  { id: "audio", label: "Audio", icon: "M9 4v11.3A3.5 3.5 0 1 0 11 18V9h6V4H9z" },
];

export function EditorLeftRail({
  rail,
  onRail,
  scene,
}: {
  rail: EditorRailId;
  onRail: (id: EditorRailId) => void;
  scene: Scene | null;
}) {
  const { project, dispatch } = useVideoProject();
  const voiceover = useVoiceoverPreview();
  const overlay = scene?.editing.textOverlay;

  return (
    <div className="flex min-h-0 min-w-0 overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex w-14 shrink-0 flex-col gap-1 border-r border-border bg-surface-soft p-1.5">
        {RAILS.map((item) => {
          const selected = rail === item.id;
          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              aria-label={item.label}
              aria-pressed={selected}
              onClick={() => onRail(item.id)}
              className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] font-semibold ${
                selected
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                <path d={item.icon} />
              </svg>
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3">
        {rail === "assets" ? (
          <div className="grid grid-cols-2 gap-2">
            {mockStockClips.map((clip) => {
              const selected = scene?.visuals.stockFootageId === clip.id;
              return (
                <button
                  key={clip.id}
                  type="button"
                  disabled={!scene}
                  onClick={() =>
                    scene &&
                    dispatch({
                      type: "PATCH_SCENE",
                      id: scene.id,
                      patch: { visuals: { stockFootageId: clip.id } },
                    })
                  }
                  className={`rounded-lg border p-2 text-left ${
                    selected
                      ? "border-accent/50 bg-accent/10"
                      : "border-border bg-surface-soft hover:border-white/20"
                  }`}
                >
                  <div
                    className="mb-1.5 h-12 rounded-md"
                    style={{
                      background: `linear-gradient(135deg, hsl(${clip.hue} 42% 28%), hsl(${(clip.hue + 40) % 360} 48% 14%))`,
                    }}
                  />
                  <p className="line-clamp-2 text-[11px] font-semibold text-foreground">{clip.title}</p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {clip.source} · {clip.duration}s
                  </p>
                </button>
              );
            })}
          </div>
        ) : null}

        {rail === "text" ? (
          <div className="space-y-3">
            <p className="text-xs text-muted">Overlay on the selected clip.</p>
            <Textarea
              rows={3}
              disabled={!scene}
              value={overlay?.text ?? ""}
              placeholder="Patagonia"
              onChange={(event) => {
                if (!scene) return;
                const text = event.target.value;
                dispatch({
                  type: "PATCH_SCENE",
                  id: scene.id,
                  patch: {
                    editing: {
                      textOverlay: text.trim()
                        ? { text, position: overlay?.position ?? "bottom" }
                        : null,
                    },
                  },
                });
              }}
            />
            <div className="flex flex-wrap gap-1">
              {OVERLAY_POSITIONS.map((position) => (
                <button
                  key={position.id}
                  type="button"
                  disabled={!scene}
                  onClick={() => {
                    if (!scene) return;
                    dispatch({
                      type: "PATCH_SCENE",
                      id: scene.id,
                      patch: {
                        editing: {
                          textOverlay: {
                            text: overlay?.text ?? scene.sectionLabel,
                            position: position.id as OverlayPosition,
                          },
                        },
                      },
                    });
                  }}
                  className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${
                    overlay?.position === position.id
                      ? "border-accent/50 bg-accent/10 text-accent"
                      : "border-border text-muted hover:text-foreground"
                  }`}
                >
                  {position.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {rail === "transitions" ? (
          <div className="space-y-2">
            <p className="text-xs text-muted">Applied at the cut into the next clip.</p>
            {TRANSITION_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={!scene}
                onClick={() =>
                  scene &&
                  dispatch({
                    type: "PATCH_SCENE",
                    id: scene.id,
                    patch: { editing: { transition: option.id as TransitionId } },
                  })
                }
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                  scene?.editing.transition === option.id
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-border text-foreground hover:bg-white/5"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}

        {rail === "audio" ? (
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Voiceover
              </p>
              {scene ? (
                <ActionButton
                  size="sm"
                  variant="secondary"
                  disabled={!scene.finalScript.trim()}
                  onClick={() => voiceover.preview(scene)}
                >
                  {voiceover.playingId === scene.id ? "Stop" : "Listen"}
                </ActionButton>
              ) : (
                <p className="text-xs text-muted">Select a clip first.</p>
              )}
              {voiceover.error ? (
                <p className="mt-1 text-xs text-accent">{voiceover.error}</p>
              ) : null}
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Music volume
              </p>
              <Input
                type="range"
                min={0}
                max={100}
                value={project.editor.musicVolume}
                onChange={(event) =>
                  dispatch({
                    type: "UPDATE_EDITOR",
                    patch: { musicVolume: Number(event.target.value) },
                  })
                }
              />
              <p className="mt-1 text-xs tabular-nums text-muted">{project.editor.musicVolume}%</p>
            </div>
            <div className="space-y-2">
              {mockMusicTracks.map((track) => {
                const selected = project.editor.musicTrackId === track.id;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() =>
                      dispatch({
                        type: "UPDATE_EDITOR",
                        patch: { musicTrackId: selected ? null : track.id },
                      })
                    }
                    className={`w-full rounded-lg border px-3 py-2 text-left ${
                      selected
                        ? "border-accent/50 bg-accent/10"
                        : "border-border hover:bg-white/5"
                    }`}
                  >
                    <p className="text-sm font-semibold text-foreground">{track.title}</p>
                    <p className="text-[11px] text-muted">
                      {track.mood} · {track.bpm} BPM · {track.duration}s
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
