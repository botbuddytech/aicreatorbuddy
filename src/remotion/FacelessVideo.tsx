"use client";

import type { CSSProperties } from "react";
import { Video } from "@remotion/media";
import { AbsoluteFill, Img, Sequence } from "remotion";
import { FILTER_CSS } from "@/lib/videoProject";
import {
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

function SceneLayer({
  scene,
  captions,
}: {
  scene: FacelessSceneProps;
  captions: boolean;
}) {
  const filter = FILTER_CSS[scene.filter] ?? "none";
  const mediaStyle: CSSProperties = {
    width: "100%",
    height: "100%",
    filter,
  };

  return (
    <AbsoluteFill>
      {scene.clipKind === "video" && scene.clipUrl ? (
        <AbsoluteFill>
          <Video
            src={scene.clipUrl}
            style={mediaStyle}
            objectFit="cover"
            // When a beat has a script, keep clip audio nearly silent so VO leads.
            volume={
              scene.finalScript.trim()
                ? Math.min(Math.max(0, scene.volume / 100), 0.08)
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
              fontSize: 48,
              fontWeight: 600,
              fontFamily: "system-ui, sans-serif",
              textShadow: "0 2px 12px rgba(0,0,0,0.65)",
            }}
          >
            {scene.textOverlay.text}
          </div>
        </AbsoluteFill>
      ) : null}

      {captions && scene.finalScript.trim() ? (
        <AbsoluteFill style={{ pointerEvents: "none" }}>
          <div
            style={{
              position: "absolute",
              left: "8%",
              right: "8%",
              bottom: "10%",
              textAlign: "center",
              color: "#fff",
              fontSize: 36,
              fontWeight: 500,
              fontFamily: "system-ui, sans-serif",
              textShadow: "0 2px 10px rgba(0,0,0,0.7)",
              maxHeight: "4.5em",
              overflow: "hidden",
            }}
          >
            {scene.finalScript}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
}

export function FacelessVideo({ aspectRatio: _aspect, captions, scenes }: FacelessVideoProps) {
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
          <SceneLayer scene={scene} captions={captions} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
