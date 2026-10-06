import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildVideoMarkdown, videoMarkdownFileName } from "./videoMarkdown";
import { createEmptyProject, createEmptyScene } from "./videoProject";

describe("video markdown", () => {
  it("keeps the script, both prompts, and an empty clip", () => {
    const project = createEmptyProject({ name: "Oracle Stock" });
    project.summary.topic = "Why the stock fell";
    project.visualStyle = "vox";
    const scene = createEmptyScene(0, {
      sectionLabel: "HOOK",
      finalScript: "Not earnings. Force majeure.",
    });
    scene.visuals.clipSource = "still";
    scene.visuals.imagePrompt = "A cream page and a falling chart.";
    scene.visuals.description = "The chart steps down for 9 seconds.";
    scene.editing.scriptDurationSeconds = 12;
    scene.editing.voiceSeconds = 9;
    project.scenes = [scene];

    const markdown = buildVideoMarkdown(project);
    assert.match(markdown, /Why the stock fell/);
    assert.match(markdown, /Name: Vox/);
    assert.match(markdown, /Not earnings\. Force majeure\./);
    assert.match(markdown, /Image, then clip/);
    assert.match(markdown, /A cream page and a falling chart\./);
    assert.match(markdown, /The chart steps down for 9 seconds\./);
    assert.match(markdown, /Voice length: 9s/);
    assert.match(markdown, /Clip: None/);
    assert.equal(videoMarkdownFileName(project), "Oracle-Stock.md");
  });
});
