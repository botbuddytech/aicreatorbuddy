"use client";

import { useEffect, useState } from "react";
import { getClip } from "@/lib/clipStore";

/** Resolves an uploaded clip to a playable object URL, revoked on change/unmount. */
export function useClipUrl(clipId: string | null): string | null {
  const [loaded, setLoaded] = useState<{ id: string; url: string } | null>(null);

  useEffect(() => {
    if (!clipId) return;

    let active = true;
    let objectUrl: string | null = null;

    getClip(clipId).then((record) => {
      if (!active || !record) return;
      objectUrl = URL.createObjectURL(record.blob);
      setLoaded({ id: clipId, url: objectUrl });
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [clipId]);

  // Derived so a clip swap reads as null immediately, without clearing state in the effect.
  return loaded && loaded.id === clipId ? loaded.url : null;
}

const NO_URLS: Record<string, string> = {};

/**
 * Batch variant for the timeline preview: every clip is resolved up front so
 * scene changes during playback don't flash while a blob loads.
 */
export function useClipUrls(clipIds: string[]): Record<string, string> {
  const key = clipIds.join(",");
  const [loaded, setLoaded] = useState<{ key: string; urls: Record<string, string> }>({
    key: "",
    urls: NO_URLS,
  });

  useEffect(() => {
    const ids = key ? key.split(",") : [];
    if (ids.length === 0) return;

    let active = true;
    const created: string[] = [];

    Promise.all(ids.map((id) => getClip(id).then((record) => [id, record] as const))).then(
      (entries) => {
        if (!active) return;
        const urls: Record<string, string> = {};
        for (const [id, record] of entries) {
          if (!record) continue;
          const url = URL.createObjectURL(record.blob);
          created.push(url);
          urls[id] = url;
        }
        setLoaded({ key, urls });
      },
    );

    return () => {
      active = false;
      for (const url of created) URL.revokeObjectURL(url);
    };
  }, [key]);

  return loaded.key === key ? loaded.urls : NO_URLS;
}

/**
 * One-shot resolve for export: creates object URLs the caller must revoke.
 */
export async function resolveClipUrls(clipIds: string[]): Promise<{
  urls: Record<string, string>;
  revoke: () => void;
}> {
  const created: string[] = [];
  const urls: Record<string, string> = {};
  const entries = await Promise.all(
    clipIds.map((id) => getClip(id).then((record) => [id, record] as const)),
  );
  for (const [id, record] of entries) {
    if (!record) continue;
    const url = URL.createObjectURL(record.blob);
    created.push(url);
    urls[id] = url;
  }
  return {
    urls,
    revoke: () => {
      for (const url of created) URL.revokeObjectURL(url);
    },
  };
}
