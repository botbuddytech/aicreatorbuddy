"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ActionButton } from "@/components/ui/ActionButton";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import {
  projectPublishTitle,
  projectThumbnailUrl,
  publishVideoToYoutube,
  type UploadPrivacy,
} from "@/lib/youtube/publishClient";

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PublishToYoutube({
  file,
}: {
  file: { blob: Blob; fileName: string; mimeType: string } | null;
}) {
  const { project } = useVideoProject();
  const searchParams = useSearchParams();
  const publishAtParam = searchParams.get("publishAt");
  const fromScheduler = searchParams.get("from") === "scheduler" || Boolean(publishAtParam);
  const initialPublishAt = useMemo(() => {
    if (!publishAtParam) return "";
    return isoToDatetimeLocal(publishAtParam);
  }, [publishAtParam]);
  const [privacy, setPrivacy] = useState<UploadPrivacy>("private");
  const [publishAt, setPublishAt] = useState(initialPublishAt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const title = projectPublishTitle(project);

  async function publish() {
    if (!file || busy) return;
    if (!project.channelId) {
      setError("Select a connected channel before publishing.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const finish = await publishVideoToYoutube({
        project,
        file,
        channelId: project.channelId,
        title,
        description: project.description,
        tags: project.tags,
        privacy,
        publishAtIso: publishAt ? new Date(publishAt).toISOString() : null,
        thumbnailUrl: projectThumbnailUrl(project),
      });
      setResult(finish.thumbnailWarning ? `${finish.url} (${finish.thumbnailWarning})` : finish.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 rounded-xl border border-border bg-surface-soft p-4">
      <h4 className="text-sm font-semibold text-foreground">Publish to YouTube</h4>
      <p className="mt-1 text-xs text-muted">
        {fromScheduler && publishAt
          ? "You chose a time on the scheduler; confirm below before publishing."
          : "Sends the rendered MP4, title, description, tags, and thumbnail to the project channel."}
      </p>
      {!file ? (
        <p className="mt-3 text-xs text-muted">Render the video in this browser first. The file stays on this device until you publish.</p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted">
            Privacy
            <select
              value={privacy}
              onChange={(event) => setPrivacy(event.target.value as UploadPrivacy)}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
            >
              <option value="private">Private</option>
              <option value="unlisted">Unlisted</option>
              <option value="public">Public</option>
            </select>
          </label>
          <label className="text-xs text-muted">
            Schedule (optional, saved as private until then)
            <input
              type="datetime-local"
              value={publishAt}
              onChange={(event) => setPublishAt(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground"
            />
          </label>
          <div className="sm:col-span-2">
            <ActionButton type="button" loading={busy} loadingLabel="Publishing…" onClick={() => void publish()}>
              Publish {file.fileName}
            </ActionButton>
          </div>
        </div>
      )}
      {error ? <p className="mt-3 text-sm text-accent">{error}</p> : null}
      {result ? (
        <a href={result.split(" ")[0]} target="_blank" rel="noreferrer" className="mt-3 block text-sm font-semibold text-accent">
          {result}
        </a>
      ) : null}
    </div>
  );
}
