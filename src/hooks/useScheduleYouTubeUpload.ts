"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { useScheduleJob } from "@/hooks/useScheduleJob";
import { getPendingScheduleUpload } from "@/lib/scheduler/schedulePendingUpload";
import { patchScheduleJob, readScheduleJob } from "@/lib/scheduler/scheduleJob";
import type { UploadChannelRef } from "@/lib/scheduler/pickUploadChannel";
import { runScheduleUpload } from "@/lib/scheduler/runScheduleUpload";

export function useScheduleYouTubeUpload(options?: {
  channels?: UploadChannelRef[];
  activeChannelId?: string | null;
}) {
  const router = useRouter();
  const job = useScheduleJob();
  const channels = options?.channels ?? [];
  const activeChannelId = options?.activeChannelId ?? null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const canUploadSession = useCallback(
    (sessionId: string) => {
      if (!job || job.sessionId !== sessionId || job.phase !== "approved") return false;
      return Boolean(getPendingScheduleUpload(sessionId));
    },
    [job],
  );

  const upload = useCallback(async () => {
    const current = readScheduleJob();
    if (!current || busy || startedRef.current) return;
    startedRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await runScheduleUpload(current, { channels, activeChannelId });
      router.refresh();
    } catch (err) {
      startedRef.current = false;
      const message = err instanceof Error ? err.message : "Upload failed.";
      setError(message);
      patchScheduleJob({ phase: "approved", progress: 0, message: "Ready to upload", error: message });
    } finally {
      setBusy(false);
    }
  }, [activeChannelId, busy, channels, router]);

  return { job, busy, error, canUploadSession, upload };
}
