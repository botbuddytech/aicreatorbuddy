"use client";

import { Modal } from "@/components/ui/Modal";

export function ScheduleExportProgressModal({
  open,
  title,
  message,
  progress,
}: {
  open: boolean;
  title: string;
  message: string;
  progress: number;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <Modal open={open} title={title} subtitle="Keep this tab open while we export in your browser." onClose={() => {}} size="sm">
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-right text-xs font-semibold text-muted">{pct}%</p>
    </Modal>
  );
}
