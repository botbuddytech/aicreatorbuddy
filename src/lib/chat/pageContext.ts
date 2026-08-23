import type { PageContext } from "@/lib/chat/types";

const MARKETING_CHIPS = [
  "Pick a faceless niche for me",
  "How does the pipeline work?",
  "Which plan should I start with?",
];

function workspace(
  pathname: string,
  title: string,
  summary: string,
  chips: string[],
  extraGreeting?: string,
): PageContext {
  return {
    pathname,
    surface: "workspace",
    title,
    summary,
    chips,
    greeting:
      extraGreeting ??
      `I'm on **${title}** with you. Ask about this screen, packaging, RPM, or what to publish next — I'll keep it practical.`,
  };
}

export function getPageContext(pathname: string): PageContext {
  const path = (pathname.split("?")[0] || "/").replace(/\/$/, "") || "/";

  if (path === "/") {
    return {
      pathname: path,
      surface: "marketing",
      title: "AI Creator Buddy",
      summary:
        "Marketing site for a faceless YouTube workspace: script → ElevenLabs voice → Seedance scenes → Remotion render → VidIQ SEO → multi-channel publish. Demo login is demo@aicreatorbuddy.app / demo1234.",
      chips: MARKETING_CHIPS,
      greeting:
        "Hey — I'm **Buddy**, your YouTube specialist. Niche, packaging, first video, or how this workspace actually runs — ask away.",
    };
  }

  if (path.startsWith("/login")) {
    return {
      pathname: path,
      surface: "login",
      title: "Log in",
      summary:
        "Demo login: demo@aicreatorbuddy.app / demo1234. Opens the multi-channel workspace. This is a mocked product demo — no live YouTube OAuth.",
      chips: ["How do I get into the workspace?", "What's inside after login?"],
      greeting:
        "Need the door code? Demo login is **demo@aicreatorbuddy.app** / **demo1234**. Or ask what the workspace can do once you're in.",
    };
  }

  if (path.startsWith("/dashboard/create")) {
    return workspace(
      path,
      "Create Video",
      "Six-step faceless pipeline: titles, thumbnails, script, timeline/scenes, description/SEO, then summary. ChatGPT or Gemini drafts; ElevenLabs for voice; Seedance for visuals; Remotion for render; VidIQ for packaging. Nothing auto-publishes.",
      ["Write a stronger hook", "How should I structure this script?", "Thumbnail that actually gets clicks"],
      "You're in the create pipeline. I can help with the hook, retention beats, thumbnail concept, or which step to lock next.",
    );
  }

  if (path.startsWith("/dashboard/analytics/rpm-cpm")) {
    return workspace(
      path,
      "RPM / CPM Insights",
      "RPM is creator take-home per thousand views. CPM is advertiser rate. Mix shifts with geo, length (mid-rolls after ~8 min), and ad format. Demo workspace uses mocked channel stats.",
      ["Why would RPM drop?", "How do I raise RPM?", "RPM vs CPM in one sentence"],
    );
  }

  if (path.startsWith("/dashboard/analytics/top-videos")) {
    return workspace(
      path,
      "Top Earning Videos",
      "Leaderboard of demo videos by revenue, RPM, CTR, and format (long / Shorts / live). Use it to clone packaging that already converts, not just chase view count.",
      ["Which videos should I clone?", "CTR is fine but revenue isn't — why?"],
    );
  }

  if (path.startsWith("/dashboard/analytics/ad-formats")) {
    return workspace(
      path,
      "Ad Formats Breakdown",
      "Share of revenue from skippable in-stream, non-skippable, bumper, overlay, Shorts feed ads. Mid-rolls on longer videos usually dominate RPM.",
      ["Which ad format should I optimize for?", "Do Shorts ads pay?"],
    );
  }

  if (path.startsWith("/dashboard/analytics")) {
    return workspace(
      path,
      "Revenue Overview",
      "Portfolio monetization for connected demo channels (Growth Lab, Viral Cuts, Studio Core). Memberships, Super Chat, merch, and ad RPM live here.",
      ["How do I read this revenue view?", "What would move earnings this month?"],
    );
  }

  if (path.startsWith("/dashboard/channels")) {
    return workspace(
      path,
      "Channels",
      "Multi-channel workspace. Growth Lab, Viral Cuts, and Studio Core are connected; NextWave is disconnected. Publish targets are per-channel. Demo only — no live YouTube connect.",
      ["How should I split niches across channels?", "Should NextWave stay disconnected?"],
    );
  }

  if (path.startsWith("/dashboard/library/drafts")) {
    return workspace(path, "Drafts", "Unfinished faceless projects waiting on a pipeline step.", [
      "Which draft should I finish first?",
      "When is a draft actually ready?",
    ]);
  }

  if (path.startsWith("/dashboard/library/scheduled")) {
    return workspace(path, "Scheduled", "Videos queued for publish in the demo scheduler.", [
      "Is this cadence too aggressive?",
      "What should I schedule next?",
    ]);
  }

  if (path.startsWith("/dashboard/library/playlists")) {
    return workspace(
      path,
      "Playlists",
      "Playlist packaging for binge sessions. Series naming and session order matter more than dumping every upload into one list.",
      ["How should I pack a binge playlist?"],
    );
  }

  if (path.startsWith("/dashboard/library")) {
    return workspace(
      path,
      "Content Library",
      "All demo videos: published, drafts, scheduled, playlists. Treat it as an inventory, not a graveyard — clone winners, kill leftovers.",
      ["What should I publish next?", "How do I turn a winner into a series?"],
    );
  }

  if (path.startsWith("/dashboard/scheduler/best-time")) {
    return workspace(
      path,
      "Best Time To Post",
      "Heatmap of when the demo audience is on YouTube. Best time is a starting slot, not a law — consistency plus packaging beats a perfect hour.",
      ["When should I post long-form?", "Do Shorts use a different hour?"],
    );
  }

  if (path.startsWith("/dashboard/scheduler")) {
    return workspace(
      path,
      "Video Scheduler",
      "Calendar and upcoming uploads. Faceless channels win on cadence you can actually keep — 3 long-form a week beats a burst then silence.",
      ["Help me set a posting cadence", "What should go out next?"],
    );
  }

  if (path.startsWith("/dashboard/integrations")) {
    return workspace(
      path,
      "AI Integrations",
      "Mocked ChatGPT, Gemini, ElevenLabs, Seedance, VidIQ, YouTube connections. This demo simulates keys; connect buttons do not call live APIs unless you add chat keys for Buddy.",
      ["Which integration matters first?", "Do I need my own API keys?"],
    );
  }

  if (path.startsWith("/dashboard/settings")) {
    return workspace(
      path,
      "Profile settings",
      "Demo account preferences. Saves are local and not persisted to a real backend.",
      ["Anything I must change before creating?"],
    );
  }

  if (path.startsWith("/dashboard")) {
    return workspace(
      path,
      "Overview",
      "Workspace home for the demo portfolio: subscribers, views, revenue rollup across Growth Lab, Viral Cuts, and Studio Core.",
      ["What should I do next?", "Help me package a video", "Why does RPM move?"],
      "I'm on your workspace overview. Next upload, packaging, or a read on the numbers — tell me what you're trying to move.",
    );
  }

  return {
    pathname: path,
    surface: "marketing",
    title: "AI Creator Buddy",
    summary: "AI Creator Buddy product surface.",
    chips: MARKETING_CHIPS,
    greeting: "Hey — I'm **Buddy**. Ask me anything about YouTube or this workspace.",
  };
}
