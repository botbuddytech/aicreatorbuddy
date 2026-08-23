"use client";

import { useEffect, useRef, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import {
  DEFAULT_PROJECT_NAME,
  isPlaceholderProjectName,
  resolveProjectName,
} from "@/lib/videoProject";

export function ProjectNameHeading() {
  const { project, dispatch } = useVideoProject();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const displayName = resolveProjectName(project);

  useEffect(() => {
    if (!editing) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, [editing]);

  function startEdit() {
    setDraft(isPlaceholderProjectName(project) ? "" : project.name);
    setEditing(true);
  }

  function save() {
    dispatch({ type: "SET_NAME", name: draft.trim() || DEFAULT_PROJECT_NAME });
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") save();
            if (event.key === "Escape") cancel();
          }}
          placeholder={DEFAULT_PROJECT_NAME}
          aria-label="Project name"
          className="glass-field min-w-0 max-w-xl flex-1 rounded-xl border border-white/12 px-3 py-1.5 font-display text-2xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted/70 focus:border-accent/50"
        />
        <ActionButton size="sm" onClick={save}>
          Save
        </ActionButton>
        <ActionButton size="sm" variant="secondary" onClick={cancel}>
          Cancel
        </ActionButton>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        {displayName}
      </h1>
      <button
        type="button"
        onClick={startEdit}
        aria-label="Edit project name"
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:bg-white/5 hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
        Edit
      </button>
    </div>
  );
}
