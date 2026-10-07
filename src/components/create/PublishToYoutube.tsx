"use client";

import { useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { useVideoProject } from "@/components/create/VideoProjectProvider";

type Privacy = "private" | "unlisted" | "public";

export function PublishToYoutube({
  file,
}: {
  file: { blob: Blob; fileName: string; mimeType: string } | null;
}) {
  const { project } = useVideoProject();
  const [privacy, setPrivacy] = useState<Privacy>("private");
  const [publishAt, setPublishAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const title =
    project.titles.find((item) => item.id === project.selectedTitleId)?.text.trim() || project.name;
  const thumbnail = project.thumbnails.find((item) => item.id === project.selectedThumbnailId);

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
      const started = await fetch("/api/youtube/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: project.id,
          channelId: project.channelId,
          title,
          description: project.description,
          tags: project.tags,
          privacy,
          publishAt: publishAt ? new Date(publishAt).toISOString() : null,
          contentLength: file.blob.size,
          contentType: file.mimeType || "video/mp4",
        }),
      });
      const startBody = (await started.json()) as { uploadUrl?: string; error?: string };
      if (!started.ok || !startBody.uploadUrl) {
        throw new Error(startBody.error || "YouTube did not start the upload.");
      }
      const uploaded = await fetch(startBody.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.mimeType || "video/mp4" },
        body: file.blob,
      });
      const uploadedBody = (await uploaded.json().catch(() => null)) as { id?: string; error?: { message?: string } } | null;
      if (!uploaded.ok || !uploadedBody?.id) {
        throw new Error(uploadedBody?.error?.message || "YouTube did not accept the video file.");
      }
      const thumb = await thumbnailPayload(thumbnail?.customUrl);
      const finished = await fetch("/api/youtube/upload/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: project.id,
          channelId: project.channelId,
          videoId: uploadedBody.id,
          ...thumb,
        }),
      });
      const finishBody = (await finished.json()) as { url?: string; error?: string; thumbnailWarning?: string | null };
      if (!finished.ok || !finishBody.url) throw new Error(finishBody.error || "Could not finish the upload.");
      setResult(finishBody.thumbnailWarning ? `${finishBody.url} (${finishBody.thumbnailWarning})` : finishBody.url);
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
        Sends the rendered MP4, title, description, tags, and thumbnail to the project channel.
      </p>
      {!file ? (
        <p className="mt-3 text-xs text-muted">Render the video in this browser first. The file stays on this device until you publish.</p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-muted">
            Privacy
            <select
              value={privacy}
              onChange={(event) => setPrivacy(event.target.value as Privacy)}
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

async function thumbnailPayload(url: string | undefined): Promise<{ thumbnailBase64: string; thumbnailType: string } | null> {
  if (!url) return null;
  if (url.startsWith("data:")) {
    const [meta, data] = url.split(",");
    return { thumbnailBase64: data ?? "", thumbnailType: meta.match(/data:(.*?);/)?.[1] ?? "image/png" };
  }
  const response = await fetch(url);
  if (!response.ok) return null;
  const blob = await response.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return { thumbnailBase64: btoa(binary), thumbnailType: blob.type || "image/jpeg" };
}
