"use client";

import { ActionButton } from "@/components/ui/ActionButton";
import { Modal } from "@/components/ui/Modal";

export function ExportVoiceModal({
  open,
  qwenName,
  elevenName,
  onClose,
  onChoose,
}: {
  open: boolean;
  qwenName: string;
  elevenName: string | null;
  onClose: () => void;
  onChoose: (provider: "qwen" | "elevenlabs") => void;
}) {
  return (
    <Modal
      open={open}
      title="Choose the voice"
      subtitle="Every scene is spoken with this voice, then stitched into the MP4."
      onClose={onClose}
    >
      <div className="flex flex-col gap-2">
        <ActionButton onClick={() => onChoose("qwen")}>Qwen · {qwenName}</ActionButton>
        <ActionButton
          variant="secondary"
          disabled={!elevenName}
          onClick={() => onChoose("elevenlabs")}
        >
          {elevenName ? `ElevenLabs · ${elevenName}` : "ElevenLabs · pick a voice on the timeline"}
        </ActionButton>
      </div>
    </Modal>
  );
}
