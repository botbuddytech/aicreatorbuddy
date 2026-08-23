"use client";

import { ActionButton } from "@/components/ui/ActionButton";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { workspaceChannels } from "@/lib/dashboardContent";
import {
  createEmptyReference,
  FORMAT_LABELS,
  INTENT_LABELS,
  lengthOptionsForFormat,
  MAX_REFERENCES,
  type VideoFormat,
  type VideoIntent,
} from "@/lib/videoProject";

function looksLikeYouTube(url: string): boolean {
  return /youtu\.be\/|youtube\.com\//i.test(url.trim());
}

export function SummaryStep() {
  const { project, dispatch } = useVideoProject();
  const { summary } = project;
  const lengthOptions = lengthOptionsForFormat(summary.format);
  const canAddReference = summary.references.length < MAX_REFERENCES;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="font-display text-lg font-semibold text-foreground">Video introduction</h3>
      <p className="mt-1 text-sm text-muted">
        This brief is passed into every later generation. Jump back anytime to refine it.
      </p>

      <div className="mt-5 space-y-4">
        <Field label="Target channel" htmlFor="summary-channel">
          <Select
            id="summary-channel"
            value={project.channelId}
            onChange={(event) =>
              dispatch({ type: "SET_CHANNEL", channelId: event.target.value })
            }
          >
            <option value="">Select a channel</option>
            {workspaceChannels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
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
            {summary.references.map((reference, index) => {
              const url = reference.url.trim();
              const urlHint =
                url && !looksLikeYouTube(url)
                  ? "Doesn’t look like a YouTube link — you can still keep it."
                  : undefined;
              return (
                <div
                  key={reference.id}
                  className="rounded-xl border border-border bg-surface-soft p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">
                      Reference {index + 1}
                    </p>
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        dispatch({
                          type: "UPDATE_SUMMARY",
                          patch: {
                            references: summary.references.filter(
                              (item) => item.id !== reference.id,
                            ),
                          },
                        })
                      }
                    >
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
                      onChange={(event) =>
                        dispatch({
                          type: "UPDATE_SUMMARY",
                          patch: {
                            references: summary.references.map((item) =>
                              item.id === reference.id
                                ? { ...item, url: event.target.value }
                                : item,
                            ),
                          },
                        })
                      }
                    />
                  </Field>
                  <div className="mt-3">
                    <Field
                      label="Transcript"
                      htmlFor={`reference-transcript-${reference.id}`}
                      hint="Optional. Paste captions if you have them."
                    >
                      <Textarea
                        id={`reference-transcript-${reference.id}`}
                        rows={4}
                        value={reference.transcript}
                        placeholder="Paste transcript (optional)"
                        onChange={(event) =>
                          dispatch({
                            type: "UPDATE_SUMMARY",
                            patch: {
                              references: summary.references.map((item) =>
                                item.id === reference.id
                                  ? { ...item, transcript: event.target.value }
                                  : item,
                              ),
                            },
                          })
                        }
                      />
                    </Field>
                  </div>
                  <div className="mt-3">
                    <ActionButton
                      size="sm"
                      variant="secondary"
                      disabled
                      title="Coming soon"
                    >
                      Fetch captions — soon
                    </ActionButton>
                  </div>
                </div>
              );
            })}
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
