import {
  sceneRuntimeSeconds,
  selectedTitle,
  type VideoProject,
} from "@/lib/videoProject";
import { FacelessVideo } from "@/remotion/FacelessVideo";
import {
  compositionSize,
  durationInFramesFromProps,
  FACELESS_FPS,
  framesForSeconds,
  type FacelessSceneProps,
  type FacelessVideoProps,
} from "@/remotion/types";

export { FacelessVideo };
export {
  compositionSize,
  durationInFramesFromProps,
  FACELESS_FPS,
  framesForSeconds,
  type FacelessSceneProps,
  type FacelessVideoProps,
};

export const FACELESS_COMPOSITION_ID = "FacelessVideo";

function isSvgDataUrl(src: string): boolean {
  return src.startsWith("data:image/svg+xml");
}

/** Build Remotion input props from the draft + IndexedDB object URLs. */
export function buildInputProps(
  project: VideoProject,
  clipUrls: Record<string, string>,
): FacelessVideoProps {
  const thumb = project.thumbnails.find((item) => item.id === project.selectedThumbnailId);
  const title = selectedTitle(project)?.text;

  return {
    aspectRatio: project.summary.aspectRatio,
    captions: project.editor.captions,
    scenes: project.scenes.map((scene, index) => {
      const clipId = scene.visuals.uploadedClipId;
      const clipUrl = clipId ? (clipUrls[clipId] ?? null) : null;
      const rawPoster =
        scene.visuals.thumbnailUrl || (index === 0 ? (thumb?.customUrl ?? null) : null);
      // Remotion's <Img> awaits img.decode(), which Chrome rejects on SVG data URLs.
      // Those posters are generated placeholders anyway, so draw them as DOM instead.
      const posterUrl = rawPoster && !isSvgDataUrl(rawPoster) ? rawPoster : null;
      return {
        id: scene.id,
        sectionLabel: scene.sectionLabel || title || `Scene ${index + 1}`,
        description: scene.visuals.description,
        durationSeconds: sceneRuntimeSeconds(scene),
        trimStartSeconds: scene.editing.trimStartSeconds,
        finalScript: scene.finalScript,
        filter: scene.editing.filter,
        volume: scene.editing.volume,
        speed: scene.editing.speed,
        textOverlay: scene.editing.textOverlay,
        clipUrl,
        posterUrl,
        clipKind: scene.visuals.uploadedClipKind,
      };
    }),
  };
}

export function playerCompositionMeta(props: FacelessVideoProps) {
  const size = compositionSize(props.aspectRatio);
  return {
    fps: FACELESS_FPS,
    durationInFrames: durationInFramesFromProps(props),
    compositionWidth: size.width,
    compositionHeight: size.height,
  };
}
