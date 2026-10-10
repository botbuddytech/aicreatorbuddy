import assert from "node:assert/strict";
import test from "node:test";
import { durationInFramesFromProps, FACELESS_FPS, framesForSeconds } from "@/remotion/types";

test("duration subtracts @remotion/transitions overlap between scenes", () => {
  const props = {
    aspectRatio: "16:9" as const,
    captions: false,
    captionFontId: null,
    captionFontWeight: "600" as const,
    captionFontSize: 42,
    scenes: [
      {
        id: "a",
        sectionLabel: "A",
        description: "",
        durationSeconds: 4,
        trimStartSeconds: 0,
        finalScript: "",
        filter: "none" as const,
        volume: 0,
        speed: 1,
        transitionIn: "none" as const,
        transitionInSeconds: 0.5,
        transition: "fade" as const,
        transitionSeconds: 0.5,
        textOverlay: null,
        clipUrl: null,
        posterUrl: null,
        clipKind: null,
        voiceoverUrl: null,
      },
      {
        id: "b",
        sectionLabel: "B",
        description: "",
        durationSeconds: 4,
        trimStartSeconds: 0,
        finalScript: "",
        filter: "none" as const,
        volume: 0,
        speed: 1,
        transitionIn: "none" as const,
        transitionInSeconds: 0.5,
        transition: "none" as const,
        transitionSeconds: 0.5,
        textOverlay: null,
        clipUrl: null,
        posterUrl: null,
        clipKind: null,
        voiceoverUrl: null,
      },
    ],
  };

  const withoutOverlap = framesForSeconds(4) + framesForSeconds(4);
  const withOverlap = durationInFramesFromProps(props);
  assert.ok(withOverlap < withoutOverlap);
  assert.equal(withOverlap, withoutOverlap - framesForSeconds(0.5));
});

test("empty scenes fall back to one second", () => {
  assert.equal(
    durationInFramesFromProps({
      aspectRatio: "16:9",
      captions: false,
      captionFontId: null,
      captionFontWeight: "600",
      captionFontSize: 42,
      scenes: [],
    }),
    FACELESS_FPS,
  );
});
