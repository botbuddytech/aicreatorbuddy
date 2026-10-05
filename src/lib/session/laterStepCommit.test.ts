import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmptyProject, createEmptyScene } from "@/lib/videoProject";
import {
  applyLaterSteps,
  captureLaterStepsCommit,
  laterStepMatches,
  withLaterStep,
} from "./laterStepCommit";

describe("laterStepCommit", () => {
  it("keeps unsaved thumbnail concepts out of the stored project", () => {
    const project = createEmptyProject({ name: "Draft" });
    const saved = captureLaterStepsCommit(project);
    project.thumbnails = [{ id: "th1", concept: "Bold face", provider: "chatgpt" }];
    project.selectedThumbnailId = "th1";

    const stored = applyLaterSteps(project, saved);
    assert.equal(stored.thumbnails.length, 0);
    assert.equal(stored.selectedThumbnailId, null);
    assert.equal(laterStepMatches(project, saved, "thumbnail"), false);
  });

  it("stores thumbnail concepts when that step is approved", () => {
    const project = createEmptyProject({ name: "Draft" });
    project.thumbnails = [{ id: "th1", concept: "Bold face", provider: "chatgpt" }];
    project.selectedThumbnailId = "th1";
    const commit = withLaterStep(
      captureLaterStepsCommit(createEmptyProject({ name: "Draft" })),
      project,
      "thumbnail",
      "approved",
    );

    const stored = applyLaterSteps(project, commit);
    assert.equal(stored.thumbnails[0]?.concept, "Bold face");
    assert.equal(stored.selectedThumbnailId, "th1");
    assert.equal(stored.stepStatus.thumbnail, "approved");
    assert.equal(laterStepMatches(project, commit, "thumbnail"), true);
  });

  it("keeps unsaved script text out of the stored project", () => {
    const project = createEmptyProject({ name: "Draft" });
    const saved = captureLaterStepsCommit(project);
    project.fullScript = "A script that is still a draft";

    const stored = applyLaterSteps(project, saved);
    assert.equal(stored.fullScript, "");
    assert.equal(laterStepMatches(project, saved, "script"), false);
  });

  it("stores the script and the Cursor prompt that produced it", () => {
    const project = createEmptyProject({ name: "Draft" });
    project.fullScript = "HOOK\nOpen the loop.\n\nOUTRO\nClose it.";
    project.cursorScriptPrompt = "Write a script about compound interest.";
    const commit = withLaterStep(
      captureLaterStepsCommit(createEmptyProject({ name: "Draft" })),
      project,
      "script",
      "approved",
    );

    const stored = applyLaterSteps(project, commit);
    assert.equal(stored.fullScript, project.fullScript);
    assert.equal(stored.cursorScriptPrompt, project.cursorScriptPrompt);
    assert.equal(stored.stepStatus.script, "approved");
    assert.equal(laterStepMatches(project, commit, "script"), true);
  });

  it("keeps unsaved timeline scenes out of the stored project", () => {
    const project = createEmptyProject({ name: "Draft" });
    const saved = captureLaterStepsCommit(project);
    project.scenes = [createEmptyScene(0, { sectionLabel: "HOOK", finalScript: "Open." })];

    const stored = applyLaterSteps(project, saved);
    assert.equal(stored.scenes.length, 0);
    assert.equal(laterStepMatches(project, saved, "timeline"), false);
  });

  it("stores broken scenes immediately and updates that same timeline on approve", () => {
    const project = createEmptyProject({ name: "Draft" });
    const scene = createEmptyScene(0, { sectionLabel: "HOOK", finalScript: "Open." });
    scene.editing.durationSeconds = 6;
    project.scenes = [scene];
    const generated = withLaterStep(
      captureLaterStepsCommit(createEmptyProject({ name: "Draft" })),
      project,
      "timeline",
      "generated",
    );

    const stored = applyLaterSteps(project, generated);
    assert.equal(stored.scenes[0]?.sectionLabel, "HOOK");
    assert.equal(stored.scenes[0]?.finalScript, "Open.");
    assert.equal(stored.scenes[0]?.editing.durationSeconds, 6);
    assert.equal(stored.stepStatus.timeline, "generated");

    project.scenes = [{ ...scene, finalScript: "Open the loop." }];
    assert.equal(applyLaterSteps(project, generated).scenes[0]?.finalScript, "Open.");
    assert.equal(laterStepMatches(project, generated, "timeline"), false);

    const approved = withLaterStep(generated, project, "timeline", "approved");
    const updated = applyLaterSteps(project, approved);
    assert.equal(updated.scenes[0]?.id, scene.id);
    assert.equal(updated.scenes[0]?.finalScript, "Open the loop.");
    assert.equal(updated.stepStatus.timeline, "approved");
    assert.equal(laterStepMatches(project, approved, "timeline"), true);
  });

  it("overwrites a saved visual prompt on the same scene", () => {
    const project = createEmptyProject({ name: "Draft" });
    const scene = createEmptyScene(0, { sectionLabel: "HOOK", finalScript: "Open." });
    scene.visuals.description = "Create a clip of 6 seconds.";
    project.scenes = [scene];
    const saved = withLaterStep(
      captureLaterStepsCommit(createEmptyProject({ name: "Draft" })),
      project,
      "timeline",
      "generated",
    );

    scene.visuals.description = "Create a clip of exactly 6 seconds. A glowing terminal.";
    const replaced = withLaterStep(saved, project, "timeline", "generated");
    const stored = applyLaterSteps(project, replaced);
    assert.equal(stored.scenes.length, 1);
    assert.equal(stored.scenes[0]?.id, scene.id);
    assert.equal(
      stored.scenes[0]?.visuals.description,
      "Create a clip of exactly 6 seconds. A glowing terminal.",
    );
  });

  it("stores the selected ElevenLabs voice with the timeline", () => {
    const project = createEmptyProject({ name: "Draft" });
    project.elevenLabsVoice = { voiceId: "JBFqnCBsd6RMkjVDRZzb", name: "Rachel" };
    const saved = withLaterStep(
      captureLaterStepsCommit(createEmptyProject({ name: "Draft" })),
      project,
      "timeline",
      "generated",
    );

    const stored = applyLaterSteps(createEmptyProject({ name: "Draft" }), saved);
    assert.deepEqual(stored.elevenLabsVoice, {
      voiceId: "JBFqnCBsd6RMkjVDRZzb",
      name: "Rachel",
    });

    project.elevenLabsVoice = { voiceId: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" };
    assert.equal(laterStepMatches(project, saved, "timeline"), false);
  });
});
