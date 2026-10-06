"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { PlaceholderImage } from "@/components/create/PlaceholderImage";
import { ExportButton } from "@/components/create/ExportButton";
import { activeSceneAt, useTimelinePlayback } from "@/components/create/useTimelinePlayback";
import { usePreviewVoiceQueue } from "@/components/create/usePreviewVoiceQueue";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { mockStockClips } from "@/lib/mockAi";
import { sceneVisualPreviewSrc } from "@/lib/sceneVisualImage";
import { useClipUrls } from "@/lib/useClipUrl";
import { useSyncedSceneVoiceover } from "@/lib/sceneVoiceover";
import {
  aspectClassName,
  aspectForFormat,
  FILTER_CSS,
  formatTimecode,
  sceneRuntimeSeconds,
  sceneTimeRange,
  sceneClipMuted,
  sceneUploadedVideoUrl,
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

function AudioReadyMark() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
      <circle cx="8" cy="8" r="8" className="fill-success" />
      <path
        d="M4.6 8.2 6.9 10.4 11.4 5.7"
        fill="none"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
  voiceId,
}: {
  scenes: Scene[];
  thumbUrl?: string;
  aspectRatio: AspectRatio;
  autoPlay?: boolean;
  voiceId: string;
}) {
  const holdRef = useRef(false);
  const { playing, elapsed, total, active, seek, toggle, restart, setPlaying } =
    useTimelinePlayback(scenes, holdRef);
  const { statusFor, readyFor } = usePreviewVoiceQueue(scenes, active?.index ?? 0, voiceId, true);
  const bufferingVoice = Boolean(active && !readyFor(active.scene));
  const waitingForVoice = Boolean(playing && bufferingVoice);
  const scrubbingRef = useRef(false);
  useEffect(() => {
    if (scrubbingRef.current) return;
    holdRef.current = waitingForVoice;
  }, [waitingForVoice, holdRef]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const [hoverScrub, setHoverScrub] = useState<{ ratio: number; time: number } | null>(null);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const elapsedRef = useRef(0);
  const [seekTick, setSeekTick] = useState(0);

  const clipUrls = useClipUrls(
    scenes
      .filter((scene) => scene.visuals.uploadedClipKind === "video" && !scene.visuals.uploadedClipUrl)
      .map((scene) => scene.visuals.uploadedClipId)
      .filter((id): id is string => Boolean(id)),
  );

  const activeSceneId = active?.scene.id ?? null;
  const activeStart = active?.start ?? 0;
  const clipMuted = active ? sceneClipMuted(active.scene) : true;
  const activeVolume = clipMuted
    ? 0
    : Math.max(0, Math.min(1, (active?.scene.editing.volume ?? 100) / 100));
  const activeSpeed =
    active?.scene.editing.speed && active.scene.editing.speed > 0
      ? active.scene.editing.speed
      : 1;
  const activeTrimStart = active?.scene.editing.trimStartSeconds ?? 0;
  const activeClipUrl = active ? sceneUploadedVideoUrl(active.scene, clipUrls) : null;

  const hasVoiceover =
    Boolean(active?.scene.finalScript.trim()) ||
    (active?.scene.voiceover.status === "ready" && Boolean(active.scene.voiceover.audioUrl));

  const audioUnlockedRef = useRef(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [voiceUnlocked, setVoiceUnlocked] = useState(false);
  const [speechBlocked, setSpeechBlocked] = useState(false);
  const [voiceSyncKey, setVoiceSyncKey] = useState(0);
  const sceneLocalSeconds = Math.max(0, elapsed - activeStart);

  // Script / saved VO tracks the active beat while the cut plays.
  useSyncedSceneVoiceover({
    scene: active?.scene ?? null,
    playing: playing && voiceUnlocked,
    enabled: Boolean(active?.scene.finalScript.trim()),
    sceneLocalSeconds,
    syncKey: voiceSyncKey,
    browserVoice: true,
    voiceId,
    onError: () => setSpeechBlocked(true),
  });

  function applyClipAudio(node: HTMLVideoElement) {
    node.muted = clipMuted;
    node.volume = clipMuted ? 0 : hasVoiceover ? Math.min(activeVolume, 0.2) : activeVolume;
  }

  function unlockAudio() {
    audioUnlockedRef.current = true;
    setAudioMuted(false);
    setVoiceUnlocked(true);
    const node = videoRef.current;
    if (!node) return;
    applyClipAudio(node);
  }

  function bumpVoiceSync() {
    setVoiceSyncKey((value) => value + 1);
  }

  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!waitingForVoice || !active) return;
    if (elapsedRef.current > active.start + 0.05) seek(active.start);
    // Snap back to the scene boundary once, then the clock stays held.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingForVoice, active?.scene.id, active?.start]);
  useEffect(() => {
    // The dock Play click opened this preview. Start the cut and the spoken script
    // together. A blocked voice stays on Play voice instead of looking like Pause.
    if (!autoPlay || total <= 0 || autoStartedRef.current) return;
    autoStartedRef.current = true;
    setPlaying(true);
    setVoiceUnlocked(true);
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
    applyClipAudio(node);
    node.playbackRate = activeSpeed;
    if (audioUnlockedRef.current && !clipMuted) {
      setAudioMuted(false);
    }
    if (!playing || waitingForVoice || dragTime !== null) {
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
  }, [playing, waitingForVoice, dragTime, activeClipUrl, activeVolume, activeSpeed, hasVoiceover, clipMuted]);

  function seekTo(seconds: number) {
    const clip = activeSceneAt(scenes, seconds);
    holdRef.current = Boolean(clip && !readyFor(clip.scene));
    unlockAudio();
    seek(seconds);
    setSeekTick((value) => value + 1);
    bumpVoiceSync();
  }

  function onToggle() {
    const voiceWaiting = hasVoiceover && (!voiceUnlocked || speechBlocked);
    // The cut can already be moving with no narration. That click should start
    // the script, not pause the preview.
    if (playing && (voiceWaiting || (!clipMuted && (audioMuted || videoRef.current?.muted)))) {
      setSpeechBlocked(false);
      unlockAudio();
      bumpVoiceSync();
      window.speechSynthesis?.resume();
      void videoRef.current?.play().catch(() => undefined);
      return;
    }
    setSpeechBlocked(false);
    unlockAudio();
    if (!playing) {
      bumpVoiceSync();
      window.speechSynthesis?.resume();
    }
    toggle();
  }

  function onRestart() {
    setSpeechBlocked(false);
    unlockAudio();
    restart();
    setSeekTick((value) => value + 1);
    bumpVoiceSync();
    window.speechSynthesis?.resume();
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

  function movePlayhead(seconds: number) {
    seek(seconds);
    setSeekTick((value) => value + 1);
  }

  function timeAt(clientX: number) {
    const node = seekBarRef.current;
    if (!node || total <= 0) return { ratio: 0, time: 0 };
    const rect = node.getBoundingClientRect();
    const ratio = rect.width <= 0 ? 0 : Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return { ratio, time: ratio * total };
  }

  function onScrubDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    scrubbingRef.current = true;
    holdRef.current = true;
    const next = timeAt(event.clientX);
    setHoverScrub(next);
    setDragTime(next.time);
    movePlayhead(next.time);
  }

  function onScrubMove(event: PointerEvent<HTMLDivElement>) {
    const next = timeAt(event.clientX);
    setHoverScrub(next);
    if (!scrubbingRef.current) return;
    setDragTime(next.time);
    movePlayhead(next.time);
  }

  function onScrubUp(event: PointerEvent<HTMLDivElement>) {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    const next = timeAt(event.clientX);
    setDragTime(null);
    setHoverScrub(null);
    seekTo(next.time);
  }

  function onScrubKey(event: KeyboardEvent<HTMLDivElement>) {
    if (total <= 0) return;
    const step = event.shiftKey ? 1 : 5;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      seekTo(Math.min(total, elapsed + step));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      seekTo(Math.max(0, elapsed - step));
    } else if (event.key === "Home") {
      event.preventDefault();
      seekTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      seekTo(total);
    }
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
  const frameClass = isVertical
    ? isFullscreen
      ? "h-[calc(100vh-8rem)] w-auto max-w-full"
      : "h-[min(62vh,560px)] w-auto max-w-full"
    : isFullscreen
      ? "w-full max-w-5xl"
      : "w-full";
  const sceneVisualSrc = active ? sceneVisualPreviewSrc(active.scene.visuals) : null;
  // An uploaded clip outranks the project thumbnail so beat one still plays.
  const showThumb = Boolean(active?.index === 0 && thumbUrl && !activeClipUrl);
  const frameSrc = showThumb ? thumbUrl : sceneVisualSrc;
  const shownTime = dragTime ?? elapsed;
  const hoverBeat = hoverScrub ? activeSceneAt(scenes, hoverScrub.time) : null;

  return (
    <div
      ref={playerRef}
      className={isFullscreen ? "flex h-screen w-screen flex-col justify-center gap-4 bg-black p-6" : "space-y-4"}
    >
      <div className={isVertical ? "flex justify-center" : "w-full"}>
        <div
          className={`relative overflow-hidden rounded-xl border border-border bg-black ${aspectClassName(aspectRatio)} ${frameClass}`}
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
                applyClipAudio(node);
                node.playbackRate = activeSpeed;
                if (audioUnlockedRef.current && !clipMuted) {
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
                hideLabel
                className="h-full w-full rounded-none"
              />
            </div>
          ) : null}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

          {bufferingVoice ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/65">
              <span
                className="h-8 w-8 animate-spin rounded-full border-2 border-white border-r-transparent"
                aria-hidden="true"
              />
              <p className="text-sm font-medium text-white">Buffering audio</p>
            </div>
          ) : null}

          <div className="absolute bottom-2 right-2 z-20 flex items-center gap-2">
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
              : hasVoiceover && (!voiceUnlocked || speechBlocked)
                ? "Play voice"
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
        ) : hasVoiceover && speechBlocked ? (
          <p className="text-xs text-muted">Click Play voice to hear this scene’s script</p>
        ) : bufferingVoice ? (
          <p className="text-xs text-muted">Buffering this scene’s audio</p>
        ) : hasVoiceover && voiceUnlocked && playing ? (
          <p className="text-xs text-muted">Speaking this beat’s script</p>
        ) : hasVoiceover && !playing ? (
          <p className="text-xs text-muted">Play to hear this beat’s script</p>
        ) : null}
        <ExportButton size="sm" className="ml-auto" />
        <ActionButton size="sm" variant="secondary" onClick={toggleFullscreen}>
          <FullscreenIcon exit={isFullscreen} />
          {isFullscreen ? "Exit full screen" : "Full screen"}
        </ActionButton>
      </div>

      <div className="space-y-1">
        <div
          ref={seekBarRef}
          role="slider"
          tabIndex={0}
          aria-label="Seek preview"
          aria-valuemin={0}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(shownTime)}
          aria-valuetext={`${formatTimecode(shownTime)} of ${formatTimecode(total)}`}
          className="group relative flex h-6 cursor-pointer items-center touch-none"
          onPointerDown={onScrubDown}
          onPointerMove={onScrubMove}
          onPointerUp={onScrubUp}
          onPointerCancel={onScrubUp}
          onPointerLeave={() => {
            if (!scrubbingRef.current) setHoverScrub(null);
          }}
          onKeyDown={onScrubKey}
        >
          <div className="relative h-1 w-full rounded-full bg-white/15 group-hover:h-1.5">
            {scenes.map((scene, index) => {
              if (index === 0 || total <= 0) return null;
              const range = sceneTimeRange(scenes, index);
              return (
                <span
                  key={scene.id}
                  className="absolute inset-y-0 w-px bg-black/50"
                  style={{ left: `${(range.start / total) * 100}%` }}
                />
              );
            })}
            <span
              className="absolute inset-y-0 left-0 rounded-full bg-accent"
              style={{ width: `${(shownTime / Math.max(total, 0.001)) * 100}%` }}
            />
            <span
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow"
              style={{ left: `${(shownTime / Math.max(total, 0.001)) * 100}%` }}
            />
          </div>
          {hoverScrub ? (
            <span
              className="pointer-events-none absolute bottom-full mb-1 rounded bg-black/85 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white"
              style={{
                left: `${hoverScrub.ratio * 100}%`,
                transform:
                  hoverScrub.ratio < 0.08
                    ? "translateX(0)"
                    : hoverScrub.ratio > 0.92
                      ? "translateX(-100%)"
                      : "translateX(-50%)",
              }}
            >
              {formatTimecode(hoverScrub.time)}
              {hoverBeat ? ` · ${String(hoverBeat.scene.order + 1).padStart(2, "0")}` : ""}
            </span>
          ) : null}
        </div>
        <div className="flex items-center justify-between text-[11px] tabular-nums text-muted">
          <span>{formatTimecode(shownTime)}</span>
          <span>{formatTimecode(total)}</span>
        </div>
      </div>

      <div className="flex h-9 overflow-hidden rounded-lg border border-border">
        {scenes.map((scene, index) => {
          const duration = sceneRuntimeSeconds(scene);
          const range = sceneTimeRange(scenes, index);
          const isActive = active?.index === index;
          const audioStatus = statusFor(scene.id);
          const generatingAudio =
            audioStatus === "generating" || (isActive && !readyFor(scene));
          const audioReady = !generatingAudio && audioStatus === "ready";
          return (
            <button
              key={scene.id}
              type="button"
              title={
                generatingAudio
                  ? `${scene.sectionLabel} · generating audio`
                  : audioReady
                    ? `${scene.sectionLabel} · audio ready`
                    : `${scene.sectionLabel} · ${range.label}`
              }
              aria-label={
                generatingAudio
                  ? `Scene ${scene.order + 1}, generating audio`
                  : audioReady
                    ? `Scene ${scene.order + 1}, audio ready`
                    : `Jump to ${scene.sectionLabel}`
              }
              aria-current={isActive ? "true" : undefined}
              aria-busy={generatingAudio || undefined}
              className={`relative min-w-0 border-r border-border text-left last:border-r-0 ${
                audioReady
                  ? isActive
                    ? "bg-success/25 text-success"
                    : "bg-success/15 text-success hover:bg-success/20"
                  : isActive
                    ? "bg-accent/20 text-accent"
                    : "bg-surface-soft text-muted hover:bg-white/5"
              }`}
              style={{ flexGrow: duration, flexBasis: 0 }}
              onClick={() => {
                seekTo(range.start);
                setPlaying(true);
              }}
            >
              <span className="flex items-center justify-center gap-1 px-1.5 py-2 text-[11px] font-semibold">
                <span className="truncate">{String(scene.order + 1).padStart(2, "0")}</span>
                {generatingAudio ? (
                  <span
                    className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent"
                    aria-hidden="true"
                  />
                ) : audioReady ? (
                  <AudioReadyMark />
                ) : null}
              </span>
              {generatingAudio ? (
                <span className="absolute inset-x-0 bottom-0 h-0.5 animate-pulse bg-accent" />
              ) : audioReady ? (
                <span className="absolute inset-x-0 bottom-0 h-1 bg-success" />
              ) : null}
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
  const aspectRatio = aspectForFormat(project.summary.format);
  const thumb = project.thumbnails.find((item) => item.id === project.selectedThumbnailId);
  const previewScenes = sceneId
    ? project.scenes.filter((scene) => scene.id === sceneId)
    : project.scenes;
  const single = sceneId ? previewScenes[0] : undefined;
  const heading = single ? "Scene preview" : "Video preview";
  const shouldAutoPlay = autoPlay ?? !sceneId;

  return (
    <Modal open={open} title={heading} size={aspectRatio === "9:16" ? "sm" : "lg"} onClose={onClose}>
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
          aspectRatio={aspectRatio}
          voiceId={project.qwenVoice.voiceId}
          autoPlay={shouldAutoPlay}
        />
      )}
    </Modal>
  );
}
