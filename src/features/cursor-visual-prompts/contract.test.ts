import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyVisualPromptVariables } from "@/features/cursor-title-generator/prompt";
import { normalizeVisualPrompts, parseCursorVisualPromptRequest } from "./contract";
import { visualStyleById } from "@/lib/visualStyles";

const scene = {
  id: "11111111-1111-4111-8111-111111111111",
  section: "HOOK",
  script: "Oracle's AI bit opens the loop.",
  durationSeconds: 6,
  order: 1,
  existingPrompt: null,
  clipSource: "direct" as const,
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
        styleId: null,
        stylePrompt: null,
      },
    );
  });

  it("accepts a known style and rejects an unknown one", () => {
    const parsed = parseCursorVisualPromptRequest({
      topic: "AI",
      title: "The quiet math",
      aspectRatio: "16:9",
      scenes: [scene],
      styleId: "pixar",
      stylePrompt: "Rounded characters and warm light.",
    });
    assert.equal(parsed?.styleId, "pixar");
    assert.equal(parsed?.stylePrompt, "Rounded characters and warm light.");
    assert.equal(
      parseCursorVisualPromptRequest({
        topic: "AI",
        title: "The quiet math",
        aspectRatio: "16:9",
        scenes: [scene],
        styleId: "claymation",
      }),
      null,
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
    assert.match(stated?.[0]?.prompt ?? "", /^Create a clip of 6 seconds\. Aspect ratio 16:9\. A glowing terminal\./);
    assert.match(stated?.[0]?.prompt ?? "", /Narration is voiceover only/);
    assert.equal(normalizeVisualPrompts({ prompts: [] }, [scene], "16:9"), null);
  });

  it("attaches the style prompt to every scene prompt", () => {
    const style = "Rounded appealing characters, soft skin, and warm global light.";
    const prompts = normalizeVisualPrompts(
      { prompts: [{ id: scene.id, prompt: "A terminal blinks on a desk." }] },
      [scene],
      "16:9",
      style,
    );
    assert.match(prompts?.[0]?.prompt ?? "", /Visual style: Rounded appealing characters/);
    assert.match(prompts?.[0]?.prompt ?? "", /exactly 6 seconds/);
    assert.match(prompts?.[0]?.prompt ?? "", /Narration is voiceover only/);
    assert.match(prompts?.[0]?.prompt ?? "", /avoid: garbled text/);

    const already = normalizeVisualPrompts(
      {
        prompts: [
          {
            id: scene.id,
            prompt: `Create a clip of 6 seconds. Aspect ratio 16:9. ${style}`,
          },
        ],
      },
      [scene],
      "16:9",
      style,
    );
    assert.equal(already?.[0]?.prompt.includes("Visual style:"), false);
    assert.equal((already?.[0]?.prompt.match(/Rounded appealing characters/g) ?? []).length, 1);
  });

  it("treats a missing clip source as a direct clip", () => {
    const { clipSource: _clipSource, ...legacy } = scene;
    const parsed = parseCursorVisualPromptRequest({
      topic: "AI",
      title: "The quiet math",
      aspectRatio: "16:9",
      scenes: [legacy],
    });
    assert.equal(parsed?.scenes[0]?.clipSource, "direct");
    assert.equal(
      parseCursorVisualPromptRequest({
        topic: "AI",
        title: "The quiet math",
        aspectRatio: "16:9",
        scenes: [{ ...scene, clipSource: "storyboard" }],
      }),
      null,
    );
  });

  it("rejects a still prompt on a direct scene and a missing still on an image scene", () => {
    const shot = { prompts: [{ id: scene.id, prompt: "A glowing terminal.", imagePrompt: "A dark desk." }] };
    assert.equal(normalizeVisualPrompts(shot, [scene], "16:9"), null);
    const still = { ...scene, clipSource: "still" as const };
    assert.equal(
      normalizeVisualPrompts({ prompts: [{ id: scene.id, prompt: "The terminal flickers." }] }, [still], "16:9"),
      null,
    );
  });

  it("writes a still prompt with the style and without a clip duration", () => {
    const still = { ...scene, id: "22222222-2222-4222-8222-222222222222", clipSource: "still" as const };
    const style = "Rounded appealing characters, soft skin, and warm global light.";
    const prompts = normalizeVisualPrompts(
      {
        prompts: [
          { id: scene.id, prompt: "Hold on the desk, then the terminal blinks.", imagePrompt: "" },
          {
            id: still.id,
            prompt: "The terminal light washes across the desk.",
            imagePrompt: "A dark desk and one glowing terminal.",
          },
        ],
      },
      [scene, still],
      "16:9",
      style,
    );
    assert.equal(prompts?.[0]?.imagePrompt, "");
    assert.match(prompts?.[0]?.prompt ?? "", /exactly 6 seconds/);
    assert.match(prompts?.[0]?.prompt ?? "", /Visual style: Rounded appealing characters/);
    assert.match(prompts?.[1]?.imagePrompt ?? "", /Aspect ratio 16:9/);
    assert.match(prompts?.[1]?.imagePrompt ?? "", /Visual style: Rounded appealing characters/);
    assert.doesNotMatch(prompts?.[1]?.imagePrompt ?? "", /seconds/);
    assert.match(prompts?.[1]?.prompt ?? "", /exactly 6 seconds/);
  });

  it("appends a style's exclusions as an avoid line", () => {
    const vox = visualStyleById("vox");
    const prompts = normalizeVisualPrompts(
      { prompts: [{ id: scene.id, prompt: "A chart drops on a cream page." }] },
      [scene],
      "9:16",
      vox.prompt,
      "vox",
    );
    const prompt = prompts?.[0]?.prompt ?? "";
    assert.match(prompt, /Visual style: Editorial explainer motion graphics/);
    assert.match(prompt, /avoid: garbled text/);
    assert.match(prompt, /photorealistic, 3D render/);
    assert.equal(prompt.includes("No host"), false);
    assert.equal(vox.prompt.includes("Negative"), false);
  });

  it("does not leave the style name in the picture prompt", () => {
    const prompts = normalizeVisualPrompts(
      { prompts: [{ id: scene.id, prompt: "A VOX logo sits on a cream chart." }] },
      [scene],
      "9:16",
      "Editorial explainer motion graphics in the style of Vox. Flat vector design.",
      "vox",
    );
    const prompt = prompts?.[0]?.prompt ?? "";
    assert.equal(/vox/i.test(prompt), false);
    assert.match(prompt, /Do not letter a style name/);
  });

  it("spells a short spoken line into the visual prompt", () => {
    const spoken = {
      ...scene,
      script:
        "Oracle's stock slid after two words hit the market. Not earnings. Not a product. Force majeure.",
    };
    const prompts = normalizeVisualPrompts(
      {
        prompts: [
          {
            id: scene.id,
            prompt:
              "Two illegible word-shaped blocks stamp onto a chart. A contract page shows unreadable texture.",
          },
        ],
      },
      [spoken],
      "9:16",
    );
    const prompt = prompts?.[0]?.prompt ?? "";
    assert.match(prompt, /"Not earnings"/);
    assert.match(prompt, /"Not a product"/);
    assert.match(prompt, /"Force majeure"/);
    assert.match(prompt, /Readable on-screen text/);
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
