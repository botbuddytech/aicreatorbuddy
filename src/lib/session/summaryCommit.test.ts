import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEmptyProject } from "@/lib/videoProject";
import {
  captureSummaryCommit,
  captureTitleCommit,
  projectForDatabase,
  projectWithSummaryCommit,
  savedTitlesForDisplay,
  selectedSavedTitle,
  summaryCommitMatches,
  titleCommitMatches,
} from "./summaryCommit";

describe("summaryCommit", () => {
  it("treats an unchanged video intro as already saved", () => {
    const project = createEmptyProject({ name: "Draft" });
    project.summary.topic = "Oracle debt";
    const commit = captureSummaryCommit(project);
    assert.equal(summaryCommitMatches(project, commit), true);
  });

  it("detects topic, length, and transcript edits", () => {
    const project = createEmptyProject({ name: "Draft" });
    const commit = captureSummaryCommit(project);
    project.summary.topic = "A new topic";
    assert.equal(summaryCommitMatches(project, commit), false);

    project.summary.topic = "";
    project.summary.durationSeconds += 30;
    assert.equal(summaryCommitMatches(project, commit), false);

    project.summary.durationSeconds = commit.summary.durationSeconds;
    project.summary.references = [
      {
        id: "ref-1",
        url: "https://www.youtube.com/watch?v=1UsAXAKDpRM",
        title: "Oracle",
        transcript: "Oracle is one of the biggest companies",
        transcriptSource: "fetched",
        fetchedUrl: "https://www.youtube.com/watch?v=1UsAXAKDpRM",
        lang: "en",
        fetchedAt: "2026-10-01T00:00:00.000Z",
      },
    ];
    assert.equal(summaryCommitMatches(project, commit), false);
  });

  it("keeps later-step edits when the saved video intro is applied", () => {
    const project = createEmptyProject({ name: "Draft" });
    project.summary.topic = "Unsaved topic";
    project.fullScript = "Script that should stay";
    const saved = createEmptyProject({ name: "Draft" });
    saved.summary.topic = "Saved topic";
    const commit = captureSummaryCommit(saved);
    commit.stepStatus = "approved";

    const stored = projectWithSummaryCommit(project, commit);
    assert.equal(stored.summary.topic, "Saved topic");
    assert.equal(stored.stepStatus.summary, "approved");
    assert.equal(stored.fullScript, "Script that should stay");
  });
});

describe("titleCommit", () => {
  it("treats an unchanged title step as already saved", () => {
    const project = createEmptyProject({ name: "Draft" });
    project.titles = [{ id: "t1", text: "Saved title", provider: "chatgpt" }];
    project.selectedTitleId = "t1";
    const commit = captureTitleCommit(project);
    assert.equal(titleCommitMatches(project, commit), true);
  });

  it("detects a new selection and a new title", () => {
    const project = createEmptyProject({ name: "Draft" });
    project.titles = [{ id: "t1", text: "Saved title", provider: "chatgpt" }];
    project.selectedTitleId = "t1";
    const commit = captureTitleCommit(project);
    project.selectedTitleId = null;
    assert.equal(titleCommitMatches(project, commit), false);
    project.selectedTitleId = "t1";
    project.titles = [...project.titles, { id: "t2", text: "Another", provider: "manual" }];
    assert.equal(titleCommitMatches(project, commit), false);
  });

  it("keeps unsaved titles out of the stored project", () => {
    const project = createEmptyProject({ name: "Draft" });
    project.summary.topic = "Unsaved topic";
    project.titles = [{ id: "t2", text: "Unsaved title", provider: "chatgpt" }];
    project.selectedTitleId = "t2";
    const saved = createEmptyProject({ name: "Draft" });
    saved.summary.topic = "Saved topic";
    saved.titles = [{ id: "t1", text: "Saved title", provider: "chatgpt" }];
    saved.selectedTitleId = "t1";
    const stored = projectForDatabase(
      project,
      captureSummaryCommit(saved),
      captureTitleCommit(saved),
    );
    assert.equal(stored.summary.topic, "Saved topic");
    assert.equal(stored.selectedTitleId, "t1");
    assert.equal(stored.titles[0]?.text, "Saved title");
  });

  it("returns the approved title and its score", () => {
    const project = createEmptyProject({ name: "Draft" });
    project.titles = [
      {
        id: "t1",
        text: "Saved title",
        provider: "cursor",
        score: { provider: "cursor", score: 88, rank: 1 },
      },
      { id: "t2", text: "Other title", provider: "manual" },
    ];
    project.selectedTitleId = "t1";
    const commit = captureTitleCommit(project);
    const selected = selectedSavedTitle(commit);
    assert.equal(selected?.text, "Saved title");
    assert.equal(selected?.score?.score, 88);
    assert.equal(selected?.score?.rank, 1);
    assert.equal(selectedSavedTitle({ ...commit, selectedTitleId: null }), null);
  });

  it("hides titles that were not selected", () => {
    const project = createEmptyProject({ name: "Draft" });
    project.titles = [
      { id: "t1", text: "First title", provider: "cursor" },
      { id: "t2", text: "Second title", provider: "manual" },
    ];
    project.selectedTitleId = null;
    assert.equal(savedTitlesForDisplay(captureTitleCommit(project)).length, 0);
    project.selectedTitleId = "t2";
    const shown = savedTitlesForDisplay(captureTitleCommit(project));
    assert.equal(shown.length, 1);
    assert.equal(shown[0]?.text, "Second title");
    assert.equal(savedTitlesForDisplay(null).length, 0);
  });
});
