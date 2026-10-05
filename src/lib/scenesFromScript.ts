import { timelineSectionsFromScript } from "@/lib/scriptSections";
import { createEmptyScene, type Scene } from "@/lib/videoProject";

/**
 * Turns a saved script into timeline scenes.
 * Each scene keeps the section name, the spoken lines, and the duration from that section.
 * Returns null when the script is empty or is not split into labeled sections.
 */
export function scenesFromScript(fullScript: string): Scene[] | null {
  const sections = timelineSectionsFromScript(fullScript.trim());
  if (!sections) return null;

  return sections.map((section, index) => {
    const scene = createEmptyScene(index, {
      sectionLabel: section.label,
      finalScript: section.body,
    });
    if (section.durationSeconds && section.durationSeconds > 0) {
      scene.editing.durationSeconds = section.durationSeconds;
      scene.editing.scriptDurationSeconds = section.durationSeconds;
    }
    scene.status = "generated";
    return scene;
  });
}
