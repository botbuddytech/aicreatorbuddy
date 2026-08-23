"use client";

import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ActionButton } from "@/components/ui/ActionButton";
import { GenerateBar } from "@/components/create/GenerateBar";
import { OptionCard } from "@/components/create/OptionCard";
import { VidIqLeaderboard, VidIqMark, VidIqTitleStats } from "@/components/create/VidIqPanel";
import { usePipelineGeneration } from "@/components/create/useGeneration";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { summaryPrompt } from "@/lib/mockAi";
import { PROVIDER_LABELS, providersForStep, type AiProvider } from "@/lib/videoProject";

export function TitleStep() {
  const { project, dispatch } = useVideoProject();
  const { busy, error, generate } = usePipelineGeneration();
  const provider = project.providerByStep.title ?? "chatgpt";
  const prompt = summaryPrompt(project.summary);
  const scored = project.titles.filter((title) => title.vidiq);

  async function generateAll() {
    const titles = await generate("all", "titles", { prompt, count: 5 }, provider, "title");
    if (titles) dispatch({ type: "SET_TITLES", titles });
  }

  async function generateOne(id: string) {
    const titles = await generate(id, "titles", { prompt, count: 1 }, provider, "title");
    const next = titles?.[0];
    if (next) dispatch({ type: "REPLACE_TITLE", id, title: { ...next, id } });
  }

  async function scoreAll() {
    if (project.titles.length === 0) return;
    const insights = await generate(
      "vidiq",
      "vidiqTitles",
      {
        titles: project.titles.map((title) => ({ id: title.id, text: title.text })),
        topic: project.summary.topic,
      },
      provider,
      "title",
    );
    if (insights) dispatch({ type: "SET_TITLE_INSIGHTS", insights });
  }

  async function scoreOne(id: string) {
    const title = project.titles.find((item) => item.id === id);
    if (!title) return;
    const insights = await generate(
      `vidiq-${id}`,
      "vidiqTitles",
      { titles: [{ id: title.id, text: title.text }], topic: project.summary.topic },
      provider,
      "title",
    );
    if (insights) dispatch({ type: "SET_TITLE_INSIGHTS", insights });
  }

  const ranked = [...scored].sort((a, b) => (b.vidiq?.score ?? 0) - (a.vidiq?.score ?? 0));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-display text-lg font-semibold text-foreground">Title generation</h3>
        <p className="mt-1 text-sm text-muted">
          Generate 4–6 candidates, regenerate one, or hand-edit. Score them with VidIQ before you lock one.
        </p>
        <div className="mt-4">
          <GenerateBar
            providers={providersForStep("title")}
            provider={provider}
            onProviderChange={(next) =>
              dispatch({ type: "SET_PROVIDER", step: "title", provider: next })
            }
            onGenerate={generateAll}
            generating={busy === "all"}
            hasOutput={project.titles.length > 0}
            generateLabel="Generate titles"
            regenerateLabel="Regenerate all"
            error={error}
            extra={
              <ActionButton
                variant="secondary"
                onClick={scoreAll}
                disabled={project.titles.length === 0}
                loading={busy === "vidiq"}
                loadingLabel="Scoring…"
              >
                <VidIqMark />
                Score with VidIQ
              </ActionButton>
            }
          />
        </div>
      </div>

      {ranked.length > 0 ? (
        <VidIqLeaderboard
          items={ranked.map((title) => ({
            id: title.id,
            label: title.text,
            value: title.vidiq?.score ?? 0,
            grade: title.vidiq?.grade,
          }))}
        />
      ) : null}

      {busy === "all" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36" />
          ))}
        </div>
      ) : project.titles.length === 0 ? (
        <EmptyState
          title="No titles yet"
          description="Fill in the video introduction, pick a provider, then generate a set of titles."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {project.titles.map((title) => (
            <OptionCard
              key={title.id}
              selected={project.selectedTitleId === title.id}
              onSelect={() => dispatch({ type: "SELECT_TITLE", id: title.id })}
              onRegenerate={() => generateOne(title.id)}
              regenerating={busy === title.id}
              onEdit={(text) => dispatch({ type: "EDIT_TITLE", id: title.id, text })}
              editSeed={title.text}
              badge={
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={title.provider === "gemini" ? "blue" : "accent"}>
                    {PROVIDER_LABELS[title.provider as AiProvider] ?? title.provider}
                  </Badge>
                  {title.vidiq ? (
                    <Badge tone="blue">
                      VidIQ {title.vidiq.score} · {title.vidiq.grade}
                    </Badge>
                  ) : null}
                </div>
              }
              extraActions={
                <ActionButton
                  size="sm"
                  variant="secondary"
                  loading={busy === `vidiq-${title.id}`}
                  loadingLabel="…"
                  onClick={() => scoreOne(title.id)}
                >
                  VidIQ
                </ActionButton>
              }
              footer={title.vidiq ? <VidIqTitleStats insight={title.vidiq} /> : null}
            >
              <p className="text-sm font-semibold leading-snug text-foreground">{title.text}</p>
            </OptionCard>
          ))}
        </div>
      )}
    </div>
  );
}
