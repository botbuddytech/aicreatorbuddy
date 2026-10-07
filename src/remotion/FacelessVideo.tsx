"use client";

import type { CSSProperties } from "react";
import { Audio, Video } from "@remotion/media";
import { AbsoluteFill, Img, Sequence, useCurrentFrame } from "remotion";
import type { VideoFontId, VideoFontWeight } from "@/lib/videoProject";
import { FILTER_CSS } from "@/lib/videoProject";
import {
  cutProgress,
  enterStyle,
  entranceProgress,
  leaveStyle,
  transitionSpanFrames,
} from "@/remotion/cutTransition";
import { remotionFontFamily } from "@/remotion/fonts";
import {
  FACELESS_FPS,
  framesForSeconds,
  framesFromSeconds,
  type FacelessSceneProps,
  type FacelessVideoProps,
} from "@/remotion/types";

function overlayStyle(position: "top" | "center" | "bottom"): CSSProperties {
  if (position === "top") return { top: "8%", left: "6%", right: "6%" };
  if (position === "center") {
    return {
      top: "50%",
      left: "6%",
      right: "6%",
      transform: "translateY(-50%)",
    };
  }
  return { bottom: "14%", left: "6%", right: "6%" };
}

function PlaceholderFill({ label }: { label: string }) {
  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, hsl(18 32% 28%) 0%, hsl(24 40% 14%) 100%)",
        justifyContent: "center",
        alignItems: "center",
        padding: 48,
      }}
    >
      <div
        style={{
          color: "rgba(255,255,255,0.92)",
          fontSize: 42,
          fontFamily: "Georgia, serif",
          textAlign: "center",
          maxWidth: "80%",
        }}
      >
        {label}
      </div>
    </AbsoluteFill>
  );
}

function textStyle(
  fontId: VideoFontId | null,
  fontWeight: VideoFontWeight,
  fontSize: number,
): CSSProperties {
  return {
    fontFamily: remotionFontFamily(fontId),
    fontWeight: Number(fontWeight),
    fontSize,
  };
}

const CAPTION_WORDS = 6;

/** A short line of the script for the current moment, not the whole scene. */
export function captionLine(script: string, frame: number, durationFrames: number): string {
  const words = script.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const progress = durationFrames <= 1 ? 1 : Math.min(1, Math.max(0, frame / (durationFrames - 1)));
  const index = Math.min(words.length - 1, Math.floor(progress * words.length));
  const start = Math.max(0, index - Math.floor(CAPTION_WORDS / 2));
  return words.slice(start, start + CAPTION_WORDS).join(" ");
}

function CaptionLine({
  script,
  frame,
  durationFrames,
  fontId,
  fontWeight,
  fontSize,
}: {
  script: string;
  frame: number;
  durationFrames: number;
  fontId: VideoFontId | null;
  fontWeight: VideoFontWeight;
  fontSize: number;
}) {
  const line = captionLine(script, frame, durationFrames);
  if (!line) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: "8%",
          right: "8%",
          bottom: "8%",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: "92%",
            padding: "0.35em 0.7em",
            borderRadius: 14,
            background: "rgba(0,0,0,0.78)",
            color: "#fff",
            textAlign: "center",
            lineHeight: 1.25,
            ...textStyle(fontId, fontWeight, fontSize),
          }}
        >
          {line}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function SceneLayer({
  scene,
  captions,
  captionFontId,
  captionFontWeight,
  captionFontSize,
}: {
  scene: FacelessSceneProps;
  captions: boolean;
  captionFontId: VideoFontId | null;
  captionFontWeight: VideoFontWeight;
  captionFontSize: number;
}) {
  const frame = useCurrentFrame();
  const durationFrames = framesForSeconds(scene.durationSeconds);
  const half = Math.max(1, Math.floor((durationFrames - 1) / 2));
  const inSpan =
    scene.transitionIn === "none"
      ? 0
      : Math.min(
          transitionSpanFrames(scene.durationSeconds, scene.transitionInSeconds, FACELESS_FPS),
          half,
        );
  const outSpan =
    scene.transition === "none"
      ? 0
      : Math.min(
          transitionSpanFrames(scene.durationSeconds, scene.transitionSeconds, FACELESS_FPS),
          half,
        );
  const entering = entranceProgress(frame, inSpan);
  const leaving = cutProgress(frame, durationFrames, outSpan);
  const filter = FILTER_CSS[scene.filter] ?? "none";
  const mediaStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    filter,
  };

  const motionStyle: CSSProperties | undefined =
    entering === null && leaving === null
      ? undefined
      : {
          ...(entering === null ? {} : enterStyle(scene.transitionIn, entering)),
          ...(leaving === null ? {} : leaveStyle(scene.transition, leaving)),
        };

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {scene.voiceoverUrl ? (
        <Audio src={scene.voiceoverUrl} disallowFallbackToHtml5Audio />
      ) : null}

      <AbsoluteFill style={motionStyle}>
      {scene.clipKind === "video" && scene.clipUrl ? (
        <AbsoluteFill>
          <Video
            src={scene.clipUrl}
            style={mediaStyle}
            objectFit="cover"
            // When a beat has a script, keep clip audio nearly silent so VO leads.
            volume={
              scene.voiceoverUrl
                ? 0
                : Math.max(0, Math.min(1, scene.volume / 100))
            }
            playbackRate={scene.speed > 0 ? scene.speed : 1}
            trimBefore={framesFromSeconds(scene.trimStartSeconds)}
          />
        </AbsoluteFill>
      ) : scene.posterUrl || (scene.clipKind === "image" && scene.clipUrl) ? (
        <AbsoluteFill>
          <Img src={scene.posterUrl || scene.clipUrl || ""} style={{ ...mediaStyle, objectFit: "cover" }} />
        </AbsoluteFill>
      ) : (
        <PlaceholderFill label={scene.description || scene.sectionLabel || "Scene"} />
      )}

      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 40%, rgba(0,0,0,0.2) 100%)",
          pointerEvents: "none",
        }}
      />

      {scene.textOverlay?.text.trim() ? (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              ...overlayStyle(scene.textOverlay.position),
              textAlign: "center",
              color: "#fff",
              textShadow: "0 2px 12px rgba(0,0,0,0.65)",
              ...textStyle(
                scene.textOverlay.fontId,
                scene.textOverlay.fontWeight,
                scene.textOverlay.fontSize,
              ),
            }}
          >
            {scene.textOverlay.text}
          </div>
        </AbsoluteFill>
      ) : null}

      {captions ? (
        <CaptionLine
          script={scene.finalScript}
          frame={frame}
          durationFrames={durationFrames}
          fontId={captionFontId}
          fontWeight={captionFontWeight}
          fontSize={captionFontSize}
        />
      ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export function FacelessVideo({
  aspectRatio: _aspect,
  captions,
  captionFontId,
  captionFontWeight,
  captionFontSize,
  scenes,
}: FacelessVideoProps) {
  void _aspect;

  if (scenes.length === 0) {
    return (
      <AbsoluteFill style={{ backgroundColor: "#08090c" }}>
        <PlaceholderFill label="No clips yet" />
      </AbsoluteFill>
    );
  }

  const starts = scenes.map((_, index) =>
    scenes
      .slice(0, index)
      .reduce((sum, scene) => sum + framesForSeconds(scene.durationSeconds), 0),
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {scenes.map((scene, index) => (
        <Sequence
          key={scene.id}
          from={starts[index] ?? 0}
          durationInFrames={framesForSeconds(scene.durationSeconds)}
          name={scene.sectionLabel || scene.id}
        >
          <SceneLayer
            scene={scene}
            captions={captions}
            captionFontId={captionFontId}
            captionFontWeight={captionFontWeight}
            captionFontSize={captionFontSize}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
