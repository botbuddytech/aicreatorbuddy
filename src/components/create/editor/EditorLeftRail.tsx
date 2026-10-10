"use client";

import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ListenButton, VoiceBuildClock } from "@/components/create/scene/ListenButton";
import { useVoiceoverPreview } from "@/components/create/useVoiceoverPreview";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { FontStyleControls, type FontStyleValue } from "@/components/create/editor/FontStyleControls";
import {
  DEFAULT_OVERLAY_FONT_SIZE,
  DEFAULT_OVERLAY_FONT_WEIGHT,
} from "@/remotion/fontCatalog";
import {
  OVERLAY_POSITIONS,
  TRANSITION_OPTIONS,
  type OverlayPosition,
  type Scene,
  type TextOverlay,
  type TransitionId,
} from "@/lib/videoProject";

export type EditorRailId = "text" | "transitions" | "audio";

const RAILS: { id: EditorRailId; label: string; icon: string }[] = [
  { id: "text", label: "Text", icon: "M5 5h14v3h-5v11h-4V8H5V5z" },
  { id: "transitions", label: "Transitions", icon: "M7 4l5 8-5 8h3l5-8-5-8H7zm7 0l5 8-5 8h3l5-8-5-8h-3z" },
  { id: "audio", label: "Audio", icon: "M9 4v11.3A3.5 3.5 0 1 0 11 18V9h6V4H9z" },
];

function TransitionChoices({
  scene,
  edge,
}: {
  scene: Scene | null;
  edge: "in" | "out";
}) {
  const { dispatch } = useVideoProject();
  const selected = edge === "in" ? scene?.editing.transitionIn : scene?.editing.transition;
  const seconds = edge === "in" ? scene?.editing.transitionInSeconds : scene?.editing.transitionSeconds;

  function choose(id: TransitionId) {
    if (!scene) return;
    dispatch({
      type: "PATCH_SCENE",
      id: scene.id,
      patch: {
        editing: edge === "in" ? { transitionIn: id } : { transition: id },
      },
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {edge === "in" ? "In · start of this clip" : "Out · end · @remotion/transitions"}
      </p>
      {TRANSITION_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          disabled={!scene}
          onClick={() => choose(option.id)}
          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${
            selected === option.id
              ? "border-accent/50 bg-accent/10 text-accent"
              : "border-border text-foreground hover:bg-white/5"
          }`}
        >
          {option.label}
        </button>
      ))}
      {scene && selected && selected !== "none" && seconds !== undefined ? (
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Length
          </span>
          <input
            type="range"
            min={0.1}
            max={2}
            step={0.1}
            className="mt-2 w-full"
            value={seconds}
            onChange={(event) =>
              dispatch({
                type: "PATCH_SCENE",
                id: scene.id,
                patch: {
                  editing:
                    edge === "in"
                      ? { transitionInSeconds: Number(event.target.value) }
                      : { transitionSeconds: Number(event.target.value) },
                },
              })
            }
          />
          <span className="mt-1 block text-xs tabular-nums text-muted">{seconds.toFixed(1)}s</span>
        </label>
      ) : null}
    </div>
  );
}

function TransitionRail({ scene }: { scene: Scene | null }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        {scene
          ? `${scene.sectionLabel}: In plays as this clip starts. Out plays as it ends.`
          : "Select a clip, then set how it enters and how it leaves."}
      </p>
      <TransitionChoices scene={scene} edge="in" />
      <div className="border-t border-border pt-4">
        <TransitionChoices scene={scene} edge="out" />
      </div>
    </div>
  );
}

function overlayDraft(
  scene: Scene,
  overlay: TextOverlay | null | undefined,
  patch: Partial<TextOverlay>,
): TextOverlay {
  return {
    text: patch.text ?? overlay?.text ?? scene.sectionLabel,
    position: patch.position ?? overlay?.position ?? "bottom",
    fontId: patch.fontId !== undefined ? patch.fontId : (overlay?.fontId ?? null),
    fontWeight: patch.fontWeight ?? overlay?.fontWeight ?? DEFAULT_OVERLAY_FONT_WEIGHT,
    fontSize: patch.fontSize ?? overlay?.fontSize ?? DEFAULT_OVERLAY_FONT_SIZE,
  };
}

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
      <div className="flex w-24 shrink-0 flex-col gap-1 overflow-hidden border-r border-border bg-surface-soft p-1.5">
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
              className={`flex w-full flex-col items-center gap-1 overflow-hidden rounded-lg px-0.5 py-2 text-[10px] font-semibold leading-none ${
                selected
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
                <path d={item.icon} />
              </svg>
              <span className="w-full truncate text-center">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-3">
        {rail === "text" ? (
          <div className="space-y-4">
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
                          ? overlayDraft(scene, overlay, { text })
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
                            textOverlay: overlayDraft(scene, overlay, {
                              position: position.id as OverlayPosition,
                            }),
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
              <FontStyleControls
                disabled={!scene}
                value={{
                  fontId: overlay?.fontId ?? null,
                  fontWeight: overlay?.fontWeight ?? DEFAULT_OVERLAY_FONT_WEIGHT,
                  fontSize: overlay?.fontSize ?? DEFAULT_OVERLAY_FONT_SIZE,
                }}
                onChange={(next: FontStyleValue) => {
                  if (!scene) return;
                  dispatch({
                    type: "PATCH_SCENE",
                    id: scene.id,
                    patch: {
                      editing: {
                        textOverlay: overlayDraft(scene, overlay, next),
                      },
                    },
                  });
                }}
              />
            </div>
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Script captions</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Show the spoken script on the video. Titles you type above stay separate.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={project.editor.captions}
                  aria-label="Script captions"
                  onClick={() =>
                    dispatch({
                      type: "UPDATE_EDITOR",
                      patch: { captions: !project.editor.captions },
                    })
                  }
                  className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full ${
                    project.editor.captions ? "bg-accent" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                      project.editor.captions ? "left-4" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
              {project.editor.captions ? (
              <FontStyleControls
                value={{
                  fontId: project.editor.captionFontId,
                  fontWeight: project.editor.captionFontWeight,
                  fontSize: project.editor.captionFontSize,
                }}
                onChange={(next) =>
                  dispatch({
                    type: "UPDATE_EDITOR",
                    patch: {
                      captionFontId: next.fontId,
                      captionFontWeight: next.fontWeight,
                      captionFontSize: next.fontSize,
                    },
                  })
                }
              />
              ) : null}
            </div>
          </div>
        ) : null}

        {rail === "transitions" ? (
          <TransitionRail scene={scene} />
        ) : null}

        {rail === "audio" ? (
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Voiceover
              </p>
              {scene ? (
                <div className="flex flex-wrap items-center gap-2">
                  <ListenButton
                    playing={voiceover.playingId === scene.id}
                    loading={voiceover.loadingId === scene.id}
                    disabled={!scene.finalScript.trim()}
                    onClick={() => voiceover.preview(scene, project.qwenVoice.voiceId)}
                  />
                </div>
              ) : (
                <p className="text-xs text-muted">Select a clip first.</p>
              )}
              {voiceover.loadingId ? (
                <p className="mt-1 text-xs text-muted">
                  Building this clip’s voice. Nothing plays until it’s ready.
                  <VoiceBuildClock />
                </p>
              ) : null}
              {voiceover.error ? (
                <p className="mt-1 text-xs text-accent">{voiceover.error}</p>
              ) : null}
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Background music volume
              </p>
              <p className="mb-2 text-xs text-muted">
                Reserved for a future music bed. Clip and voice levels are on the right inspector.
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
            {scene && scene.visuals.uploadedClipKind === "video" ? (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Clip audio
                </p>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={scene.editing.clipMuted === false}
                    onChange={(event) =>
                      dispatch({
                        type: "PATCH_SCENE",
                        id: scene.id,
                        patch: { editing: { clipMuted: !event.target.checked } },
                      })
                    }
                  />
                  Play uploaded clip sound
                </label>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
