import type { StepStatus, TitleOption, VideoProject, VideoSummary } from "@/lib/videoProject";

export type SummaryCommit = {
  channelId: string;
  summary: VideoSummary;
  stepStatus: StepStatus;
};

export function captureSummaryCommit(project: VideoProject): SummaryCommit {
  return {
    channelId: project.channelId,
    summary: structuredClone(project.summary),
    stepStatus: project.stepStatus.summary,
  };
}

export function summaryCommitMatches(
  project: VideoProject,
  commit: SummaryCommit,
): boolean {
  return (
    project.channelId === commit.channelId &&
    summarySignature(project.summary) === summarySignature(commit.summary)
  );
}

export function projectWithSummaryCommit(
  project: VideoProject,
  commit: SummaryCommit,
): VideoProject {
  return {
    ...project,
    channelId: commit.channelId,
    summary: commit.summary,
    stepStatus: { ...project.stepStatus, summary: commit.stepStatus },
  };
}

export type TitleCommit = {
  titles: TitleOption[];
  selectedTitleId: string | null;
  cursorTitlePrompt: string | null;
  provider: VideoProject["providerByStep"]["title"];
  stepStatus: StepStatus;
};

export function captureTitleCommit(project: VideoProject): TitleCommit {
  return {
    titles: structuredClone(project.titles),
    selectedTitleId: project.selectedTitleId,
    cursorTitlePrompt:
      typeof project.cursorTitlePrompt === "string" ? project.cursorTitlePrompt : null,
    provider: project.providerByStep.title,
    stepStatus: project.stepStatus.title,
  };
}

export function selectedSavedTitle(commit: TitleCommit | null): TitleOption | null {
  if (!commit?.selectedTitleId) return null;
  return commit.titles.find((title) => title.id === commit.selectedTitleId) ?? null;
}

/** The one title the thumbnail step should show from the last approved title save. */
export function savedTitlesForDisplay(commit: TitleCommit | null): TitleOption[] {
  const selected = selectedSavedTitle(commit);
  return selected?.text.trim() ? [selected] : [];
}

export function titleCommitMatches(project: VideoProject, commit: TitleCommit): boolean {
  return (
    project.selectedTitleId === commit.selectedTitleId &&
    (project.cursorTitlePrompt ?? null) === commit.cursorTitlePrompt &&
    project.providerByStep.title === commit.provider &&
    titleSignature(project.titles) === titleSignature(commit.titles)
  );
}

export function projectForDatabase(
  project: VideoProject,
  summary: SummaryCommit,
  title: TitleCommit,
): VideoProject {
  const withSummary = projectWithSummaryCommit(project, summary);
  return {
    ...withSummary,
    titles: title.titles,
    selectedTitleId: title.selectedTitleId,
    cursorTitlePrompt: title.cursorTitlePrompt,
    providerByStep: title.provider
      ? { ...withSummary.providerByStep, title: title.provider }
      : withSummary.providerByStep,
    stepStatus: { ...withSummary.stepStatus, title: title.stepStatus },
  };
}

function titleSignature(titles: TitleOption[]): string {
  return JSON.stringify(
    titles.map((title) => ({
      id: title.id,
      text: title.text,
      provider: title.provider,
      score: title.score ?? null,
      vidiq: title.vidiq ?? null,
    })),
  );
}

function summarySignature(summary: VideoSummary): string {
  return JSON.stringify({
    topic: summary.topic,
    format: summary.format,
    aspectRatio: summary.aspectRatio,
    intent: summary.intent,
    durationSeconds: summary.durationSeconds,
    references: summary.references.map((reference) => ({
      id: reference.id,
      url: reference.url,
      title: reference.title,
      transcript: reference.transcript,
      transcriptSource: reference.transcriptSource,
      fetchedUrl: reference.fetchedUrl,
      lang: reference.lang,
      fetchedAt: reference.fetchedAt,
    })),
  });
}
