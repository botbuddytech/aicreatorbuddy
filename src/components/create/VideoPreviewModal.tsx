"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { PlaceholderImage } from "@/components/create/PlaceholderImage";
import { ExportButton } from "@/components/create/ExportButton";
import { useTimelinePlayback } from "@/components/create/useTimelinePlayback";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { mockStockClips } from "@/lib/mockAi";
import { sceneVisualPreviewSrc } from "@/lib/sceneVisualImage";
import { useClipUrls } from "@/lib/useClipUrl";
import { useSyncedSceneVoiceover } from "@/lib/sceneVoiceover";
import {
  FILTER_CSS,
  formatTimecode,
  sceneRuntimeSeconds,
  sceneTimeRange,
  selectedTitle,
  type AspectRatio,
  type Scene,
} from "@/lib/videoProject";

function clipFor(scene: Scene) {
  return mockStockClips.find((clip) => clip.id === scene.visuals.stockFootageId);
}

function visualLabel(scene: Scene): string {
  const clip = clipFor(scene);
  const description = scene.visuals.description.trim();
  return clip?.title || description || scene.sectionLabel;
}

function FullscreenIcon({ exit }: { exit: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {exit ? (
        <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" />
      ) : (
        <path d="M8 3H4v4M16 3h4v4M8 21H4v-4M16 21h4v-4" />
      )}
    </svg>
  );
}

function PreviewPlayer({
  scenes,
  thumbUrl,
  aspectRatio,
  autoPlay = true,
}: {
  scenes: Scene[];
  thumbUrl?: string;
  aspectRatio: AspectRatio;
  autoPlay?: boolean;
}) {
  const { playing, elapsed, total, active, progress, seek, toggle, restart, setPlaying } =
    useTimelinePlayback(scenes);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const seekBarRef = useRef<HTMLButtonElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const elapsedRef = useRef(0);
  const [seekTick, setSeekTick] = useState(0);

  const clipUrls = useClipUrls(
    scenes
      .map((scene) => scene.visuals.uploadedClipId)
      .filter((id): id is string => Boolean(id)),
  );

  const activeSceneId = active?.scene.id ?? null;
  const activeStart = active?.start ?? 0;
  const activeVolume = Math.max(
    0,
    Math.min(1, (active?.scene.editing.volume ?? 100) / 100),
  );
  const activeSpeed =
    active?.scene.editing.speed && active.scene.editing.speed > 0
      ? active.scene.editing.speed
      : 1;
  const activeTrimStart = active?.scene.editing.trimStartSeconds ?? 0;
  const activeClipUrl =
    active?.scene.visuals.uploadedClipKind === "video" && active.scene.visuals.uploadedClipId
      ? (clipUrls[active.scene.visuals.uploadedClipId] ?? null)
      : null;

  const hasVoiceover =
    Boolean(active?.scene.finalScript.trim()) ||
    (active?.scene.voiceover.status === "ready" && Boolean(active.scene.voiceover.audioUrl));

  const audioUnlockedRef = useRef(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [voiceUnlocked, setVoiceUnlocked] = useState(false);
  const [voiceSyncKey, setVoiceSyncKey] = useState(0);
  const sceneLocalSeconds = Math.max(0, elapsed - activeStart);

  // Script / saved VO tracks the active beat while the cut plays.
  useSyncedSceneVoiceover({
    scene: active?.scene ?? null,
    playing: playing && voiceUnlocked,
    enabled: Boolean(hasVoiceover),
    sceneLocalSeconds,
    syncKey: voiceSyncKey,
  });

  function unlockAudio() {
    audioUnlockedRef.current = true;
    setAudioMuted(false);
    setVoiceUnlocked(true);
    const node = videoRef.current;
    if (!node) return;
    node.muted = false;
    // Duck the clip under narration when this beat has a script.
    node.volume = hasVoiceover ? Math.min(activeVolume, 0.2) : activeVolume;
  }

  function bumpVoiceSync() {
    setVoiceSyncKey((value) => value + 1);
  }

  useEffect(() => {
    // Autoplay is usually muted by the browser. Skip it for single-clip opens so
    // the user's Play click can start with sound.
    if (autoPlay && total > 0) setPlaying(true);
  }, [total, setPlaying, autoPlay]);

  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  const syncClipTime = useCallback(() => {
    const node = videoRef.current;
    if (!node) return;
    const offset =
      Math.max(0, elapsedRef.current - activeStart) * activeSpeed + activeTrimStart;
    const duration = Number.isFinite(node.duration) ? node.duration : null;
    node.currentTime = duration ? Math.min(offset, Math.max(0, duration - 0.05)) : offset;
  }, [activeStart, activeSpeed, activeTrimStart]);

  // Line the clip up with the timeline clock when the beat changes or the user seeks.
  useEffect(() => {
    if (!activeClipUrl) return;
    syncClipTime();
  }, [activeClipUrl, activeSceneId, seekTick, syncClipTime]);

  useEffect(() => {
    const node = videoRef.current;
    if (!node || !activeClipUrl) return;
    // Keep ambient clip audio quiet under the spoken script.
    node.volume = hasVoiceover ? Math.min(activeVolume, 0.2) : activeVolume;
    node.playbackRate = activeSpeed;
    if (audioUnlockedRef.current) {
      node.muted = false;
      setAudioMuted(false);
    }
    if (!playing) {
      node.pause();
      return;
    }
    let cancelled = false;
    void node.play().catch(() => {
      // Autoplay policy: keep visuals moving muted until the user clicks a control.
      if (cancelled || audioUnlockedRef.current) return;
      node.muted = true;
      setAudioMuted(true);
      void node.play().catch(() => undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [playing, activeClipUrl, activeVolume, activeSpeed, hasVoiceover]);

  function seekTo(seconds: number) {
    unlockAudio();
    seek(seconds);
    setSeekTick((value) => value + 1);
    bumpVoiceSync();
  }

  function onToggle() {
    // Autoplay often starts muted. A Play click while already playing should
    // unlock sound instead of pausing — otherwise it feels like "no audio".
    if (playing && (audioMuted || videoRef.current?.muted)) {
      unlockAudio();
      bumpVoiceSync();
      void videoRef.current?.play().catch(() => undefined);
      return;
    }
    unlockAudio();
    if (!playing) bumpVoiceSync();
    toggle();
  }

  function onRestart() {
    unlockAudio();
    restart();
    setSeekTick((value) => value + 1);
    bumpVoiceSync();
  }

  useEffect(() => {
    const node = playerRef.current;
    function onChange() {
      setIsFullscreen(document.fullscreenElement === node);
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      if (document.fullscreenElement === node) {
        void document.exitFullscreen();
      }
    };
  }, []);

  function seekFromClientX(clientX: number) {
    const node = seekBarRef.current;
    if (!node || total <= 0) return;
    const rect = node.getBoundingClientRect();
    const ratio = rect.width <= 0 ? 0 : (clientX - rect.left) / rect.width;
    seekTo(ratio * total);
  }

  async function toggleFullscreen() {
    const node = playerRef.current;
    if (!node) return;
    try {
      if (document.fullscreenElement === node) {
        await document.exitFullscreen();
      } else {
        await node.requestFullscreen();
      }
    } catch {
      /* unsupported or dismissed */
    }
  }

  const isVertical = aspectRatio === "9:16";
  const frameWidth = isVertical
    ? isFullscreen
      ? "mx-auto w-full max-w-sm"
      : "mx-auto w-full max-w-[220px]"
    : isFullscreen
      ? "mx-auto w-full max-w-5xl"
      : "mx-auto w-full max-w-md";
  const overlay = active?.scene.editing.textOverlay;
  const overlayClass =
    overlay?.position === "top"
      ? "top-10"
      : overlay?.position === "center"
        ? "top-1/2 -translate-y-1/2"
        : "bottom-16";
  const sceneVisualSrc = active ? sceneVisualPreviewSrc(active.scene.visuals) : null;
  // An uploaded clip outranks the project thumbnail so beat one still plays.
  const showThumb = Boolean(active?.index === 0 && thumbUrl && !activeClipUrl);
  const frameSrc = showThumb ? thumbUrl : sceneVisualSrc;

  return (
    <div
      ref={playerRef}
      className={isFullscreen ? "flex h-screen w-screen flex-col justify-center gap-4 bg-black p-6" : "space-y-4"}
    >
      <div className={frameWidth}>
        <div
          className={`relative overflow-hidden rounded-xl border border-border bg-black ${
            isVertical ? "aspect-[9/16]" : "aspect-video"
          }`}
          style={{ filter: FILTER_CSS[active?.scene.editing.filter ?? "none"] }}
        >
          {activeClipUrl ? (
            <video
              key={activeClipUrl}
              ref={videoRef}
              src={activeClipUrl}
              poster={sceneVisualSrc ?? undefined}
              playsInline
              onLoadedMetadata={() => {
                syncClipTime();
                const node = videoRef.current;
                if (!node) return;
                node.volume = hasVoiceover ? Math.min(activeVolume, 0.2) : activeVolume;
                node.playbackRate = activeSpeed;
                if (audioUnlockedRef.current) {
                  node.muted = false;
                  setAudioMuted(false);
                }
                if (playing) {
                  void node.play().catch(() => {
                    if (audioUnlockedRef.current) return;
                    node.muted = true;
                    setAudioMuted(true);
                    void node.play().catch(() => undefined);
                  });
                }
              }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : frameSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={frameSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : active ? (
            <div className="absolute inset-0">
              <PlaceholderImage
                label={visualLabel(active.scene)}
                className="h-full w-full rounded-none"
              />
            </div>
          ) : null}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

          {overlay?.text.trim() ? (
            <p
              className={`pointer-events-none absolute inset-x-4 text-center text-lg font-semibold text-white drop-shadow ${overlayClass}`}
            >
              {overlay.text}
            </p>
          ) : null}

          {active ? (
            <>
              <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
                <Badge tone="muted">
                  {String(active.scene.order + 1).padStart(2, "0")} · {active.scene.sectionLabel}
                </Badge>
              </div>
              {active.scene.finalScript.trim() ? (
                <p className="absolute inset-x-4 bottom-10 line-clamp-3 text-sm font-medium leading-snug text-white">
                  {active.scene.finalScript}
                </p>
              ) : null}
            </>
          ) : null}

          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <p className="text-xs tabular-nums text-white/80">
              {formatTimecode(elapsed)} / {formatTimecode(total)}
            </p>
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
              title={isFullscreen ? "Exit full screen" : "Full screen"}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/50 text-white hover:bg-black/70"
            >
              <FullscreenIcon exit={isFullscreen} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ActionButton size="sm" onClick={onToggle}>
          {playing
            ? audioMuted
              ? "Unmute"
              : "Pause"
            : elapsed >= total && total > 0
              ? "Replay"
              : "Play"}
        </ActionButton>
        <ActionButton size="sm" variant="secondary" onClick={onRestart}>
          Restart
        </ActionButton>
        {audioMuted && playing ? (
          <p className="text-xs text-muted">Browser blocked autoplay sound — click Unmute</p>
        ) : hasVoiceover && voiceUnlocked && playing ? (
          <p className="text-xs text-muted">Speaking this beat’s script with the clip</p>
        ) : hasVoiceover && !playing ? (
          <p className="text-xs text-muted">Play to hear this beat’s script with the clip</p>
        ) : null}
        <ExportButton size="sm" className="ml-auto" />
        <ActionButton size="sm" variant="secondary" onClick={toggleFullscreen}>
          <FullscreenIcon exit={isFullscreen} />
          {isFullscreen ? "Exit full screen" : "Full screen"}
        </ActionButton>
      </div>

      <button
        ref={seekBarRef}
        type="button"
        aria-label="Seek preview"
        className="relative block h-2 w-full overflow-hidden rounded-full bg-white/10"
        onClick={(event) => seekFromClientX(event.clientX)}
      >
        <span
          className="absolute inset-y-0 left-0 bg-accent"
          style={{ width: `${progress * 100}%` }}
        />
      </button>

      <div className="flex h-9 overflow-hidden rounded-lg border border-border">
        {scenes.map((scene, index) => {
          const duration = sceneRuntimeSeconds(scene);
          const range = sceneTimeRange(scenes, index);
          const isActive = active?.index === index;
          return (
            <button
              key={scene.id}
              type="button"
              title={`${scene.sectionLabel} · ${range.label}`}
              aria-label={`Jump to ${scene.sectionLabel}`}
              aria-current={isActive ? "true" : undefined}
              className={`min-w-0 border-r border-border text-left last:border-r-0 ${
                isActive
                  ? "bg-accent/20 text-accent"
                  : "bg-surface-soft text-muted hover:bg-white/5"
              }`}
              style={{ flexGrow: duration, flexBasis: 0 }}
              onClick={() => {
                seekTo(range.start);
                setPlaying(true);
              }}
            >
              <span className="block truncate px-2 py-2 text-[11px] font-semibold">
                {String(scene.order + 1).padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function VideoPreviewModal({
  open,
  onClose,
  sceneId,
  autoPlay,
}: {
  open: boolean;
  onClose: () => void;
  sceneId?: string;
  /** Defaults to true for full cuts; pass false for single-clip opens so Play keeps sound. */
  autoPlay?: boolean;
}) {
  const { project } = useVideoProject();
  const title = selectedTitle(project)?.text ?? (project.summary.topic || "Untitled video");
  const thumb = project.thumbnails.find((item) => item.id === project.selectedThumbnailId);
  const previewScenes = sceneId
    ? project.scenes.filter((scene) => scene.id === sceneId)
    : project.scenes;
  const single = sceneId ? previewScenes[0] : undefined;
  const heading = single ? "Scene preview" : "Video preview";
  const subtitle = single ? `${title} · ${single.sectionLabel}` : title;
  const shouldAutoPlay = autoPlay ?? !sceneId;

  return (
    <Modal open={open} title={heading} subtitle={subtitle} size="lg" onClose={onClose}>
      {previewScenes.length === 0 ? (
        <EmptyState
          title={sceneId ? "Scene not found" : "Break into scenes first"}
          description="The preview walks through each timeline scene. Generate a script, then split it on the Timeline step."
        />
      ) : (
        <PreviewPlayer
          key={sceneId ?? "all"}
          scenes={previewScenes}
          thumbUrl={sceneId ? undefined : thumb?.customUrl}
          aspectRatio={project.summary.aspectRatio}
          autoPlay={shouldAutoPlay}
        />
      )}
    </Modal>
  );
}
