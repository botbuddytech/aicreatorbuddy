"use client";

import { useRef } from "react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ActionButton } from "@/components/ui/ActionButton";
import { GenerateBar } from "@/components/create/GenerateBar";
import { OptionCard } from "@/components/create/OptionCard";
import { PlaceholderImage } from "@/components/create/PlaceholderImage";
import { VidIqLeaderboard, VidIqMark, VidIqThumbStats } from "@/components/create/VidIqPanel";
import { usePipelineGeneration } from "@/components/create/useGeneration";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { summaryPrompt } from "@/lib/mockAi";
import { newId, PROVIDER_LABELS, providersForStep, type AiProvider } from "@/lib/videoProject";

export function ThumbnailStep() {
  const { project, dispatch } = useVideoProject();
  const { busy, error, generate } = usePipelineGeneration();
  const fileRef = useRef<HTMLInputElement>(null);
  const provider = project.providerByStep.thumbnail ?? "chatgpt";
  const prompt = summaryPrompt(project.summary);
  const scored = project.thumbnails.filter((thumb) => thumb.vidiq);
  const ranked = [...scored].sort((a, b) => (b.vidiq?.ctr ?? 0) - (a.vidiq?.ctr ?? 0));
  const leader = ranked[0];
  const challenger = ranked[1];

  async function generateAll() {
    const thumbnails = await generate(
      "all",
      "thumbnails",
      { prompt, count: 4 },
      provider,
      "thumbnail",
    );
    if (thumbnails) dispatch({ type: "SET_THUMBNAILS", thumbnails });
  }

  async function generateOne(id: string) {
    const thumbnails = await generate(
      id,
      "thumbnails",
      { prompt, count: 1 },
      provider,
      "thumbnail",
    );
    const next = thumbnails?.[0];
    if (next) dispatch({ type: "REPLACE_THUMBNAIL", id, thumbnail: { ...next, id } });
  }

  async function analyzeAll() {
    if (project.thumbnails.length === 0) return;
    const insights = await generate(
      "vidiq",
      "vidiqThumbnails",
      {
        thumbnails: project.thumbnails.map((thumb) => ({
          id: thumb.id,
          concept: thumb.concept,
        })),
      },
      provider,
      "thumbnail",
    );
    if (insights) dispatch({ type: "SET_THUMBNAIL_INSIGHTS", insights });
  }

  async function analyzeOne(id: string) {
    const thumb = project.thumbnails.find((item) => item.id === id);
    if (!thumb) return;
    const insights = await generate(
      `vidiq-${id}`,
      "vidiqThumbnails",
      { thumbnails: [{ id: thumb.id, concept: thumb.concept }] },
      provider,
      "thumbnail",
    );
    if (insights) dispatch({ type: "SET_THUMBNAIL_INSIGHTS", insights });
  }

  function onUpload(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const customUrl = typeof reader.result === "string" ? reader.result : "";
      dispatch({
        type: "ADD_THUMBNAIL",
        thumbnail: {
          id: newId(),
          concept: file.name || "Custom upload",
          provider,
          customUrl,
        },
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Thumbnail generation
        </h3>
        <p className="mt-1 text-sm text-muted">
          Mock concept frames for now. Run VidIQ CTR analysis before you pick a winner.
        </p>
        <div className="mt-4">
          <GenerateBar
            providers={providersForStep("thumbnail")}
            provider={provider}
            onProviderChange={(next) =>
              dispatch({ type: "SET_PROVIDER", step: "thumbnail", provider: next })
            }
            onGenerate={generateAll}
            generating={busy === "all"}
            hasOutput={project.thumbnails.length > 0}
            generateLabel="Generate concepts"
            regenerateLabel="Regenerate all"
            error={error}
            extra={
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onUpload(file);
                    event.target.value = "";
                  }}
                />
                <ActionButton variant="secondary" onClick={() => fileRef.current?.click()}>
                  Upload custom
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onClick={analyzeAll}
                  disabled={project.thumbnails.length === 0}
                  loading={busy === "vidiq"}
                  loadingLabel="Analyzing…"
                >
                  <VidIqMark />
                  Analyze with VidIQ
                </ActionButton>
              </>
            }
          />
        </div>
      </div>

      {ranked.length > 0 ? (
        <VidIqLeaderboard
          items={ranked.map((thumb) => ({
            id: thumb.id,
            label: thumb.concept,
            value: thumb.vidiq?.ctr ?? 0,
            suffix: "% CTR",
            grade: thumb.vidiq?.grade,
          }))}
        />
      ) : null}

      {leader && challenger ? (
        <div className="rounded-2xl border border-chart-blue/30 bg-surface p-5">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-display text-base font-semibold text-foreground">
              A/B mockup
            </h4>
            <VidIqMark />
          </div>
          <p className="mt-1 text-xs text-muted">
            Highest CTR vs runner-up — not a live test, just a ranking from the mock scorer.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[leader, challenger].map((thumb, index) => (
              <button
                key={thumb.id}
                type="button"
                onClick={() => dispatch({ type: "SELECT_THUMBNAIL", id: thumb.id })}
                className={`rounded-xl border p-3 text-left ${
                  project.selectedThumbnailId === thumb.id
                    ? "border-accent/50 bg-accent/10"
                    : "border-border bg-surface-soft"
                }`}
              >
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-chart-blue">
                  Variant {index === 0 ? "A" : "B"} · {thumb.vidiq?.ctr}% CTR
                </p>
                {thumb.customUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb.customUrl}
                    alt=""
                    className="aspect-video w-full rounded-lg object-cover"
                  />
                ) : (
                  <PlaceholderImage label={thumb.concept} />
                )}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {busy === "all" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="aspect-video" />
          ))}
        </div>
      ) : project.thumbnails.length === 0 ? (
        <EmptyState
          title="No thumbnail concepts yet"
          description="Generate a grid of concepts, or upload a custom thumbnail."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {project.thumbnails.map((thumb) => (
            <OptionCard
              key={thumb.id}
              selected={project.selectedThumbnailId === thumb.id}
              onSelect={() => dispatch({ type: "SELECT_THUMBNAIL", id: thumb.id })}
              onRegenerate={thumb.customUrl ? undefined : () => generateOne(thumb.id)}
              regenerating={busy === thumb.id}
              onEdit={(concept) =>
                dispatch({
                  type: "REPLACE_THUMBNAIL",
                  id: thumb.id,
                  thumbnail: { ...thumb, concept, vidiq: undefined },
                })
              }
              editSeed={thumb.concept}
              badge={
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={thumb.customUrl ? "success" : thumb.provider === "gemini" ? "blue" : "accent"}>
                    {thumb.customUrl
                      ? "Custom"
                      : (PROVIDER_LABELS[thumb.provider as AiProvider] ?? thumb.provider)}
                  </Badge>
                  {thumb.vidiq ? (
                    <Badge tone="blue">
                      {thumb.vidiq.ctr}% CTR · {thumb.vidiq.grade}
                    </Badge>
                  ) : null}
                </div>
              }
              extraActions={
                <ActionButton
                  size="sm"
                  variant="secondary"
                  loading={busy === `vidiq-${thumb.id}`}
                  loadingLabel="…"
                  onClick={() => analyzeOne(thumb.id)}
                >
                  VidIQ
                </ActionButton>
              }
              footer={thumb.vidiq ? <VidIqThumbStats insight={thumb.vidiq} /> : null}
            >
              {thumb.customUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumb.customUrl}
                  alt={thumb.concept}
                  className="aspect-video w-full rounded-xl object-cover"
                />
              ) : (
                <PlaceholderImage label={thumb.concept} />
              )}
              <p className="mt-2 text-xs text-muted">{thumb.concept}</p>
            </OptionCard>
          ))}
        </div>
      )}
    </div>
  );
}
