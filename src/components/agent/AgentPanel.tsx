"use client";

import { useAgentStore } from "@/components/agent/store";
import { AgentHeader } from "@/components/agent/AgentHeader";
import { Composer } from "@/components/agent/Composer";
import { MessageList } from "@/components/agent/MessageList";

export function AgentPanel({ onClose }: { onClose: () => void }) {
  const status = useAgentStore((state) => state.streamingStatus);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <AgentHeader onClose={onClose} />
      <div className="sr-only" aria-live="polite">
        {status === "thinking" ? "Agent is thinking" : status === "streaming" ? "Agent is responding" : ""}
      </div>
      <MessageList />
      <Composer />
    </div>
  );
}
