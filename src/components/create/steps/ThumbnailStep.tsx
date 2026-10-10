"use client";

import { useRef, useState } from "react";
import { FieldFlash } from "@/components/agent/FieldFlash";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActionButton } from "@/components/ui/ActionButton";
import { Modal } from "@/components/ui/Modal";
import { GenerateBar } from "@/components/create/GenerateBar";
import { OptionCard } from "@/components/create/OptionCard";
import { PlaceholderImage } from "@/components/create/PlaceholderImage";
import { StepFixModal } from "@/components/create/StepFixModal";
import { VidIqMark, VidIqThumbStats } from "@/components/create/VidIqPanel";
import { CursorPromptEditor } from "@/features/cursor-title-generator/CursorPromptEditor";
import { THUMBNAIL_PROMPT_TITLE } from "@/features/cursor-title-generator/prompt";
import { useCursorThumbnailPromptGeneration } from "@/features/cursor-thumbnail-prompts/ThumbnailPromptActions";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { useFilteredGenerators } from "@/components/create/useFilteredGenerators";
import {
  FORMAT_LABELS,
  INTENT_LABELS,
  newId,
  PROVIDER_LABELS,
  selectedTitle,
  type ThumbnailOption,
  type VidIqThumbInsight,
} from "@/lib/videoProject";
import { parseYoutubeVideoId } from "@/lib/youtube/transcript";

const THUMBNAIL_GENERATORS = ["chatgpt", "gemini", "cursor", "vidiq"] as const;
type ThumbnailGenerator = (typeof THUMBNAIL_GENERATORS)[number];
const THUMBNAIL_GENERATOR_LABELS: Record<ThumbnailGenerator, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  cursor: "Cursor",
  vidiq: "vidIQ",
};

function thumbnailSourceLabel(provider: ThumbnailOption["provider"]): string {
  if (provider === "cursor") return "Cursor";
  if (provider === "vidiq") return "vidIQ";
  if (provider === "manual") return "Custom";
  return PROVIDER_LABELS[provider];
}

export function ThumbnailStep() {
  const { project, dispatch } = useVideoProject();
  const [promptOpen, setPromptOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [generator, setGenerator] = useState<ThumbnailGenerator>("cursor");
  const [missingProvider, setMissingProvider] = useState<Exclude<ThumbnailGenerator, "cursor"> | null>(
    null,
  );
  const thumbnailGenerators = useFilteredGenerators(
    THUMBNAIL_GENERATORS,
    generator,
    setGenerator,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const promptImageRef = useRef<HTMLInputElement>(null);
  const promptImageId = useRef<string | null>(null);
  const chosenTitle = selectedTitle(project)?.text.trim() ?? "";
  const referenceVideoId =
    project.summary.references
      .map((reference) => parseYoutubeVideoId(reference.url))
      .find((id): id is string => Boolean(id)) ?? "";

  const cursorGeneration = useCursorThumbnailPromptGeneration({
    title: chosenTitle,
    format: FORMAT_LABELS[project.summary.format],
    intent: INTENT_LABELS[project.summary.intent],
    onPrompts: (prompts, promptUsed) => {
      recordThumbnailFire("cursor", "thumbnailPrompts");
      dispatch({
        type: "SET_THUMBNAILS",
        cursorPrompt: promptUsed,
        thumbnails: prompts.map((concept) => ({
          id: newId(),
          concept,
          provider: "cursor" as const,
        })),
      });
    },
  });

  function recordThumbnailFire(providerName: string, kind: string) {
    dispatch({
      type: "RECORD_API_COST",
      entry: {
        id: newId(),
        at: new Date().toISOString(),
        step: "thumbnail",
        provider: providerName,
        kind,
        usd: 0,
      },
    });
  }

  async function copyPrompt(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
      }, 1500);
    } catch {
      setCopiedId(null);
    }
  }

  function generatePrompts() {
    if (generator === "cursor") {
      void cursorGeneration.generate();
      return;
    }
    setMissingProvider(generator);
  }

  async function analyzeAll() {
    const ready = project.thumbnails.filter((thumb) => thumb.customUrl?.startsWith("https://"));
    if (ready.length === 0) {
      setUploadError("Generate or upload an image before analyzing with vidIQ.");
      return;
    }
    if (!chosenTitle) {
      setUploadError("Select a title before analyzing thumbnails.");
      return;
    }
    if (!referenceVideoId) {
      setUploadError("Add a reference YouTube video first. vidIQ scores each thumbnail against one.");
      return;
    }
    setUploadError(null);
    setGeneratingId("analyze");
    try {
      const response = await fetch("/api/vidiq/thumbnails/score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: project.id,
          title: chosenTitle,
          videoId: referenceVideoId,
          thumbnails: ready.map((thumb) => ({ id: thumb.id, imageUrl: thumb.customUrl })),
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        insights?: Record<string, VidIqThumbInsight>;
        error?: string;
      } | null;
      if (!response.ok || !payload?.insights) {
        throw new Error(payload?.error || "vidIQ could not score the thumbnails.");
      }
      dispatch({ type: "SET_THUMBNAIL_INSIGHTS", insights: payload.insights });
      recordThumbnailFire("vidiq", "vidiqThumbnailScore");
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "vidIQ could not score the thumbnails.");
    } finally {
      setGeneratingId(null);
    }
  }

  async function generateImage(thumb: ThumbnailOption) {
    const prompt = thumb.concept.trim();
    if (!prompt || generatingId) return;
    setGeneratingId(thumb.id);
    setUploadError(null);
    try {
      const response = await fetch("/api/vidiq/thumbnails/image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: project.id,
          thumbnailId: thumb.id,
          prompt,
          title: chosenTitle,
          format: project.summary.format,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || "vidIQ could not generate the image.");
      }
      dispatch({
        type: "REPLACE_THUMBNAIL",
        id: thumb.id,
        thumbnail: { ...thumb, customUrl: payload.url },
      });
      recordThumbnailFire("vidiq", "vidiqThumbnailImage");
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "vidIQ could not generate the image.");
    } finally {
      setGeneratingId(null);
    }
  }

  async function uploadThumbnailFile(thumbnailId: string, file: File): Promise<string> {
    const body = new FormData();
    body.set("thumbnailId", thumbnailId);
    body.set("file", file);
    const response = await fetch(
      `/api/create/sessions/${encodeURIComponent(project.id)}/thumbnails/image`,
      { method: "POST", body },
    );
    const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (!response.ok || !payload?.url) {
      throw new Error(payload?.error || "Could not upload the image.");
    }
    return payload.url;
  }

  async function attachImage(id: string, file: File) {
    const thumb = project.thumbnails.find((item) => item.id === id);
    if (!thumb) return;
    setUploadingId(id);
    setUploadError(null);
    try {
      const customUrl = await uploadThumbnailFile(id, file);
      dispatch({
        type: "REPLACE_THUMBNAIL",
        id,
        thumbnail: { ...thumb, customUrl },
      });
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "Could not upload the image.");
    } finally {
      setUploadingId(null);
    }
  }

  async function onUpload(file: File) {
    const id = newId();
    setUploadingId(id);
    setUploadError(null);
    try {
      const customUrl = await uploadThumbnailFile(id, file);
      dispatch({
        type: "ADD_THUMBNAIL",
        thumbnail: {
          id,
          concept: file.name || "Custom upload",
          provider: "manual",
          customUrl,
        },
      });
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "Could not upload the image.");
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Thumbnail generation
        </h3>
        <p className="mt-1 text-sm text-muted">
          Generate thumbnail prompts from the selected title. VidIQ on each card turns that prompt into an image.
        </p>
        <div className="mt-4">
          <GenerateBar
            providers={thumbnailGenerators}
            provider={generator}
            providerLabels={THUMBNAIL_GENERATOR_LABELS}
            showProviderIcons
            onProviderChange={setGenerator}
            onGenerate={generatePrompts}
            generating={cursorGeneration.generating}
            hasOutput={project.thumbnails.length > 0}
            generateLabel="Generate prompts"
            regenerateLabel="Generate prompts"
            extra={
              <>
                <CursorPromptEditor
                  kind="thumbnailPromptGeneration"
                  enabled={cursorGeneration.enabled}
                  standalone
                  label="Cursor prompt"
                  variables={[{ token: THUMBNAIL_PROMPT_TITLE, value: chosenTitle }]}
                />
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
                <ActionButton
                  variant="secondary"
                  onClick={() => fileRef.current?.click()}
                  loading={uploadingId !== null && !project.thumbnails.some((thumb) => thumb.id === uploadingId)}
                  loadingLabel="Uploading…"
                >
                  Upload custom
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onClick={analyzeAll}
                  disabled={project.thumbnails.length === 0}
                  loading={generatingId === "analyze"}
                  loadingLabel="Analyzing…"
                >
                  <VidIqMark />
                  Analyze with VidIQ
                </ActionButton>
              </>
            }
          />
          {cursorGeneration.error ? (
            <p className="mt-3 rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent">
              {cursorGeneration.error}
            </p>
          ) : null}
          <StepFixModal
            open={cursorGeneration.fixOpen}
            step="title"
            title="No title selected"
            message="Select a title there, then generate thumbnail prompts."
            onClose={() => cursorGeneration.setFixOpen(false)}
          />
          <StepFixModal
            open={missingProvider !== null}
            step="thumbnail"
            title={`${
              missingProvider === "gemini"
                ? "Gemini"
                : missingProvider === "vidiq"
                  ? "vidIQ"
                  : "ChatGPT"
            } isn't integrated yet`}
            message="Select Cursor to generate thumbnail prompts."
            onClose={() => setMissingProvider(null)}
          />
          {uploadError ? (
            <p className="mt-3 rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent">{uploadError}</p>
          ) : null}
        </div>
      </div>

      <FieldFlash field="thumbnail" className="rounded-2xl">
      {project.cursorThumbnailPrompt ? (
        <div className="mb-3 flex justify-end">
          <ActionButton size="sm" variant="secondary" onClick={() => setPromptOpen(true)}>
            Prompt used
          </ActionButton>
        </div>
      ) : null}
      {project.thumbnails.length === 0 ? (
        <EmptyState
          title="No thumbnail prompts yet"
          description="Generate prompts with Cursor or vidIQ, or upload a custom thumbnail."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {project.thumbnails.map((thumb) => (
            <OptionCard
              key={thumb.id}
              selected={project.selectedThumbnailId === thumb.id}
              onSelect={() => dispatch({ type: "SELECT_THUMBNAIL", id: thumb.id })}
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
                  <Badge
                    tone={
                      thumb.provider === "manual"
                        ? "success"
                        : thumb.provider === "vidiq" || thumb.provider === "gemini"
                          ? "blue"
                          : "accent"
                    }
                  >
                    {thumbnailSourceLabel(thumb.provider)}
                  </Badge>
                  {thumb.customUrl && thumb.provider !== "manual" ? (
                    <Badge tone="success">Image</Badge>
                  ) : null}
                  {thumb.vidiq ? (
                    <Badge tone="blue">
                      {typeof thumb.vidiq.score === "number"
                        ? `${thumb.vidiq.score} · ${thumb.vidiq.grade}`
                        : `${thumb.vidiq.ctr}% CTR · ${thumb.vidiq.grade}`}
                    </Badge>
                  ) : null}
                </div>
              }
              extraActions={
                <>
                  <ActionButton
                    size="sm"
                    variant="secondary"
                    onClick={() => void copyPrompt(thumb.id, thumb.concept)}
                  >
                    {copiedId === thumb.id ? "Copied" : "Copy"}
                  </ActionButton>
                  <ActionButton
                    size="sm"
                    variant="secondary"
                    loading={uploadingId === thumb.id}
                    loadingLabel="Uploading…"
                    onClick={() => {
                      promptImageId.current = thumb.id;
                      promptImageRef.current?.click();
                    }}
                  >
                    {thumb.customUrl ? "Replace image" : "Upload image"}
                  </ActionButton>
                  <ActionButton
                    size="sm"
                    variant="secondary"
                    loading={generatingId === thumb.id}
                    loadingLabel="Generating…"
                    disabled={generatingId !== null && generatingId !== thumb.id}
                    onClick={() => void generateImage(thumb)}
                  >
                    VidIQ
                  </ActionButton>
                </>
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
                <PlaceholderImage label={thumb.concept} hideLabel />
              )}
              <p className="mt-2 text-sm font-medium leading-snug text-foreground">{thumb.concept}</p>
            </OptionCard>
          ))}
        </div>
      )}
      </FieldFlash>
      <Modal
        open={promptOpen}
        size="lg"
        title="Prompt used"
        subtitle="The exact Cursor prompt that generated the current thumbnail prompts."
        onClose={() => setPromptOpen(false)}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {project.cursorThumbnailPrompt}
        </p>
        {project.thumbnails.length > 0 ? (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
              Prompts generated
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-foreground">
              {project.thumbnails.map((thumb) => (
                <li key={thumb.id}>{thumb.concept}</li>
              ))}
            </ol>
          </div>
        ) : null}
      </Modal>
      <input
        ref={promptImageRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          const id = promptImageId.current;
          if (file && id) attachImage(id, file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
