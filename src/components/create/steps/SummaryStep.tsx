"use client";

import Link from "next/link";
import { ActionButton } from "@/components/ui/ActionButton";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { useReferenceTranscript } from "@/lib/useReferenceTranscript";
import {
  createEmptyReference,
  FORMAT_LABELS,
  INTENT_LABELS,
  lengthOptionsForFormat,
  MAX_REFERENCES,
  type ReferenceVideo,
  type VideoFormat,
  type VideoIntent,
} from "@/lib/videoProject";
import type { ConnectedChannel } from "@/lib/youtube/repo";

function looksLikeYouTube(url: string): boolean {
  const value = url.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return true;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const candidate =
      host === "youtu.be"
        ? pathParts[0]
        : host === "youtube.com" || host.endsWith(".youtube.com")
          ? parsed.searchParams.get("v") ??
            (["shorts", "embed", "live"].includes(pathParts[0] ?? "")
              ? pathParts[1]
              : null)
          : null;
    return Boolean(candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate));
  } catch {
    return false;
  }
}

export function SummaryStep({ channels }: { channels: ConnectedChannel[] }) {
  const { project, dispatch } = useVideoProject();
  const { fetchTranscript, removeReference, pending, errors } =
    useReferenceTranscript(project.id);
  const { summary } = project;
  const lengthOptions = lengthOptionsForFormat(summary.format);
  const canAddReference = summary.references.length < MAX_REFERENCES;
  const selectedStillConnected = channels.some((channel) => channel.id === project.channelId);
  const channelValue = selectedStillConnected ? project.channelId : "";

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-display text-lg font-semibold text-foreground">Video introduction</h3>
      <p className="mt-1 text-sm text-muted">
        This brief is passed into every later generation. Jump back anytime to refine it.
      </p>

      <div className="mt-5 space-y-4">
        <Field
          label="Target channel"
          htmlFor="summary-channel"
          hint={
            channels.length === 0 ? (
              <>
                No channels connected yet.{" "}
                <Link href="/dashboard/channels" className="font-semibold text-accent hover:text-accent-dark">
                  Connect one
                </Link>
              </>
            ) : undefined
          }
        >
          <Select
            id="summary-channel"
            value={channelValue}
            disabled={channels.length === 0}
            onChange={(event) =>
              dispatch({ type: "SET_CHANNEL", channelId: event.target.value })
            }
          >
            <option value="">
              {channels.length === 0 ? "Connect a channel first" : "Select a channel"}
            </option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.title}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Format">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormatCard
              format="shorts"
              selected={summary.format === "shorts"}
              onSelect={() => dispatch({ type: "UPDATE_SUMMARY", patch: { format: "shorts" } })}
            />
            <FormatCard
              format="long-form"
              selected={summary.format === "long-form"}
              onSelect={() =>
                dispatch({ type: "UPDATE_SUMMARY", patch: { format: "long-form" } })
              }
            />
          </div>
        </Field>

        <Field label="Intent">
          <div className="grid grid-cols-2 gap-2">
            {(["educational", "entertainment"] as const).map((intent) => (
              <IntentChip
                key={intent}
                intent={intent}
                selected={summary.intent === intent}
                onSelect={() => dispatch({ type: "UPDATE_SUMMARY", patch: { intent } })}
              />
            ))}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Length" htmlFor="summary-length">
            <Select
              id="summary-length"
              value={summary.durationSeconds}
              onChange={(event) =>
                dispatch({
                  type: "UPDATE_SUMMARY",
                  patch: { durationSeconds: Number(event.target.value) },
                })
              }
            >
              {lengthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Topic / idea" htmlFor="summary-topic">
            <Input
              id="summary-topic"
              value={summary.topic}
              placeholder="e.g. Faceless system for managing 5 YouTube brands"
              onChange={(event) =>
                dispatch({ type: "UPDATE_SUMMARY", patch: { topic: event.target.value } })
              }
            />
          </Field>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">Reference videos</p>
          <p className="mb-3 text-xs text-muted">
            Paste links and optional transcripts. Fetch captions is not required to continue.
          </p>
          <div className="space-y-3">
            {summary.references.map((reference, index) => (
              <ReferenceCard
                key={reference.id}
                reference={reference}
                index={index}
                pending={Boolean(pending[reference.id])}
                error={errors[reference.id] ?? null}
                onRemove={() => {
                  removeReference(reference.id);
                  dispatch({
                    type: "UPDATE_SUMMARY",
                    patch: {
                      references: summary.references.filter(
                        (item) => item.id !== reference.id,
                      ),
                    },
                  });
                }}
                onChange={(next) =>
                  dispatch({
                    type: "UPDATE_SUMMARY",
                    patch: {
                      references: summary.references.map((item) =>
                        item.id === reference.id ? next : item,
                      ),
                    },
                  })
                }
                onFetch={async () => {
                  const result = await fetchTranscript({ reference, order: index });
                  if (!result) return;
                  dispatch({
                    type: "UPDATE_SUMMARY",
                    patch: {
                      references: summary.references.map((item) =>
                        item.id === reference.id
                          ? {
                              ...item,
                              transcript: result.transcript,
                              transcriptSource: "fetched",
                              fetchedUrl: reference.url.trim(),
                              lang: result.lang,
                              fetchedAt: result.fetchedAt,
                            }
                          : item,
                      ),
                    },
                  });
                }}
              />
            ))}
          </div>
          {canAddReference ? (
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-accent hover:text-accent-dark"
              onClick={() =>
                dispatch({
                  type: "UPDATE_SUMMARY",
                  patch: {
                    references: [...summary.references, createEmptyReference()],
                  },
                })
              }
            >
              + Add reference
            </button>
          ) : (
            <p className="mt-3 text-xs text-muted">Up to {MAX_REFERENCES} references.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ReferenceCard({
  reference,
  index,
  pending,
  error,
  onRemove,
  onChange,
  onFetch,
}: {
  reference: ReferenceVideo;
  index: number;
  pending: boolean;
  error: string | null;
  onRemove: () => void;
  onChange: (reference: ReferenceVideo) => void;
  onFetch: () => Promise<void>;
}) {
  const url = reference.url.trim();
  const parseable = looksLikeYouTube(url);
  const stale = Boolean(reference.fetchedUrl && reference.fetchedUrl !== url);
  const wordCount = reference.transcript.trim()
    ? reference.transcript.trim().split(/\s+/).length
    : 0;
  const transcriptHint = stale
    ? "Link changed since the last fetch — refetch to update."
    : reference.transcriptSource === "fetched"
      ? `${wordCount.toLocaleString()} words${reference.lang ? ` · ${reference.lang}` : ""}`
      : "Optional. Paste captions if you have them.";
  const urlHint =
    url && !parseable
      ? "Enter a YouTube video link to fetch its transcript."
      : undefined;

  return (
    <div className="rounded-xl border border-border bg-surface-soft p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">Reference {index + 1}</p>
        <ActionButton size="sm" variant="ghost" disabled={pending} onClick={onRemove}>
          Remove
        </ActionButton>
      </div>
      <Field
        label="Video link"
        htmlFor={`reference-url-${reference.id}`}
        hint={urlHint}
      >
        <Input
          id={`reference-url-${reference.id}`}
          value={reference.url}
          placeholder="https://youtube.com/watch?v=…"
          disabled={pending}
          onChange={(event) => onChange({ ...reference, url: event.target.value })}
        />
      </Field>
      <div className="mt-3">
        <Field
          label="Transcript"
          htmlFor={`reference-transcript-${reference.id}`}
          hint={transcriptHint}
          error={error ?? undefined}
        >
          {pending ? (
            <div aria-live="polite" aria-busy="true">
              <span className="sr-only">Fetching transcript</span>
              <Skeleton className="h-[106px] w-full" />
            </div>
          ) : (
            <Textarea
              id={`reference-transcript-${reference.id}`}
              rows={4}
              value={reference.transcript}
              placeholder="Paste transcript (optional)"
              onChange={(event) =>
                onChange({
                  ...reference,
                  transcript: event.target.value,
                  transcriptSource: event.target.value.trim() ? "manual" : null,
                  fetchedUrl: null,
                  lang: null,
                  fetchedAt: null,
                })
              }
            />
          )}
        </Field>
      </div>
      <div className="mt-3">
        <ActionButton
          size="sm"
          variant="secondary"
          loading={pending}
          loadingLabel="Fetching transcript…"
          disabled={!parseable}
          onClick={() => void onFetch()}
        >
          {reference.transcript ? "Refetch transcript" : "Fetch transcript"}
        </ActionButton>
      </div>
    </div>
  );
}

function FormatCard({
  format,
  selected,
  onSelect,
}: {
  format: VideoFormat;
  selected: boolean;
  onSelect: () => void;
}) {
  const shorts = format === "shorts";
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`rounded-2xl border p-4 text-center transition-colors ${
        selected
          ? "border-accent/50 bg-accent/10"
          : "border-border bg-surface-soft hover:border-white/20"
      }`}
    >
      <div
        className={`mx-auto mb-3 rounded-md border ${
          shorts
            ? "h-16 w-9 border-accent/70 bg-accent-soft"
            : "h-10 w-[4.5rem] border-border bg-surface"
        }`}
        aria-hidden="true"
      />
      <p className="text-sm font-semibold text-foreground">{FORMAT_LABELS[format]}</p>
      <p className="mt-0.5 text-xs text-muted">
        {shorts ? "9:16 · vertical" : "16:9 · landscape"}
      </p>
    </button>
  );
}

function IntentChip({
  intent,
  selected,
  onSelect,
}: {
  intent: VideoIntent;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
        selected
          ? "border-accent/50 bg-accent/10 text-accent"
          : "border-border bg-surface-soft text-foreground hover:border-white/20"
      }`}
    >
      {INTENT_LABELS[intent]}
    </button>
  );
}
