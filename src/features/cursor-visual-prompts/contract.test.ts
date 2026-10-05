import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyVisualPromptVariables } from "@/features/cursor-title-generator/prompt";
import { normalizeVisualPrompts, parseCursorVisualPromptRequest } from "./contract";

const scene = {
  id: "11111111-1111-4111-8111-111111111111",
  section: "HOOK",
  script: "Oracle's AI bit opens the loop.",
  durationSeconds: 6,
};

describe("visual prompt contract", () => {
  it("requires a section, a script, and an integer duration for each scene", () => {
    assert.equal(
      parseCursorVisualPromptRequest({ topic: "", title: "", aspectRatio: "16:9", scenes: [] }),
      null,
    );
    assert.equal(
      parseCursorVisualPromptRequest({
        topic: "AI",
        title: "The quiet math",
        aspectRatio: "16:9",
        scenes: [{ ...scene, durationSeconds: 6.5 }],
      }),
      null,
    );
    assert.equal(
      parseCursorVisualPromptRequest({ topic: "AI", title: "The quiet math", scenes: [scene] }),
      null,
    );
    assert.deepEqual(
      parseCursorVisualPromptRequest({
        topic: "AI",
        title: "The quiet math",
        aspectRatio: "9:16",
        scenes: [scene],
      }),
      {
        topic: "AI",
        title: "The quiet math",
        aspectRatio: "9:16",
        scenes: [{ ...scene, order: 1, existingPrompt: null }],
        sequence: [{ ...scene, order: 1, existingPrompt: null }],
      },
    );
  });

  it("keeps one prompt per scene and states the clip length", () => {
    const prompts = normalizeVisualPrompts(
      { prompts: [{ id: scene.id, prompt: "A tight shot of a glowing terminal." }] },
      [scene],
      "16:9",
    );
    assert.equal(prompts?.[0]?.id, scene.id);
    assert.match(prompts?.[0]?.prompt ?? "", /exactly 6 seconds/);
    assert.match(prompts?.[0]?.prompt ?? "", /Aspect ratio 16:9/);

    const stated = normalizeVisualPrompts(
      {
        prompts: [
          { id: scene.id, prompt: "Create a clip of 6 seconds. Aspect ratio 16:9. A glowing terminal." },
        ],
      },
      [scene],
      "16:9",
    );
    assert.equal(
      stated?.[0]?.prompt,
      "Create a clip of 6 seconds. Aspect ratio 16:9. A glowing terminal.",
    );
    assert.equal(normalizeVisualPrompts({ prompts: [] }, [scene], "16:9"), null);
  });

  it("fills the scene tokens in the editable prompt", () => {
    const filled = applyVisualPromptVariables(
      "Section {{section}} lasts {{duration}} seconds.\n{{script}}",
      {
        section: "HOOK",
        script: "Open the loop.",
        duration: "6",
        aspectRatio: "16:9",
        topic: "AI",
        title: "The quiet math",
      },
    );
    assert.match(filled, /Section HOOK lasts 6 seconds/);
    assert.match(filled, /Open the loop/);
    assert.match(filled, /Aspect ratio:\n16:9/);
    assert.match(filled, /Topic \/ idea:\nAI/);
  });
});
