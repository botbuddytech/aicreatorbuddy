import type { StepId } from "@/lib/videoProject";

const SUGGESTIONS: Record<StepId, string[]> = {
  summary: [
    "Sharpen this brief into one sentence",
    "Suggest a target length for this topic",
    "List 3 angles for the intro",
    "Rewrite the topic for a Short",
  ],
  title: [
    "Write 5 title options",
    "Make the title more specific",
    "Suggest a curiosity-gap title",
    "Shorten the title under 60 characters",
  ],
  thumbnail: [
    "Suggest a thumbnail concept",
    "Give me a high-contrast thumbnail idea",
    "Write on-image text under 4 words",
    "Describe a face-free thumbnail",
  ],
  script: [
    "Write a 60-second script about this topic",
    "Tighten the script to 60s",
    "Strengthen the opening hook",
    "Add a clear call to action",
  ],
  timeline: [
    "Break the script into scenes",
    "Shorten each scene to one beat",
    "Add a hook scene at the start",
    "Suggest b-roll for each scene",
  ],
  description: [
    "Write a YouTube description",
    "Add timestamps from the timeline",
    "Suggest 8 tags",
    "Tighten the first two lines",
  ],
  render: [
    "What is still missing before render?",
    "Mark the script step approved",
    "Summarize readiness",
    "Jump to the first incomplete step",
  ],
  editor: [
    "Suggest a tighter cold open",
    "Which scene should I trim?",
    "Rewrite the opening line",
    "Check the description against the script",
  ],
};

export function suggestionsFor(step: StepId): string[] {
  return SUGGESTIONS[step];
}
