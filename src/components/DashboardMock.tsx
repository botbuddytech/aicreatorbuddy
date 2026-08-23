const pipeline: {
  tool: string;
  label: string;
  done?: boolean;
  active?: boolean;
}[] = [
  { tool: "ChatGPT", label: "Script", done: true },
  { tool: "ElevenLabs", label: "Voice", done: true },
  { tool: "Seedance", label: "Visuals", active: true },
  { tool: "Remotion", label: "Edit" },
  { tool: "VidIQ", label: "SEO" },
  { tool: "YouTube", label: "Publish" },
];

const channels = [
  { initials: "GT", name: "Growth Lab", color: "bg-[#ff3b4e]", active: true },
  { initials: "VL", name: "Viral Cuts", color: "bg-[#3b82f6]", active: false },
  { initials: "SC", name: "Studio Core", color: "bg-[#22c55e]", active: false },
] as const;

export function DashboardMock({ className = "max-w-5xl" }: { className?: string }) {
  return (
    <div className={`relative mx-auto w-full ${className}`}>
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-accent/20 via-transparent to-accent/5 blur-2xl" />
      <div className="glass-card relative overflow-hidden rounded-[1.5rem] lg:rounded-[1.75rem]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/90 text-white">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                <path d="M8 5.5v13l11-6.5L8 5.5z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-dashboard-text">AI Creator Buddy</p>
              <p className="text-xs text-dashboard-muted">Faceless video, many channels.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-dashboard-panel px-3 py-1.5 text-xs font-medium text-dashboard-muted">
            <span className="animate-pulse-dot h-2 w-2 rounded-full bg-success" />
            Pipeline live
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-dashboard-border bg-dashboard-panel p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-dashboard-text">Create pipeline</p>
                <p className="mt-1 text-xs text-dashboard-muted">
                  Edit & preview each step before you continue
                </p>
              </div>
              <span className="rounded-md bg-accent/15 px-2 py-1 text-[11px] font-semibold text-[#ff8f9a]">
                Step 3 / 6
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {pipeline.map((step) => (
                <div
                  key={step.tool}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${
                    step.active
                      ? "border-accent/50 bg-accent/10"
                      : "border-dashboard-border bg-dashboard/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        step.done
                          ? "bg-success"
                          : step.active
                            ? "animate-pulse-dot bg-accent"
                            : "bg-dashboard-muted/50"
                      }`}
                    />
                    <div>
                      <p className="text-xs font-semibold text-dashboard-text">{step.label}</p>
                      <p className="text-[10px] text-dashboard-muted">{step.tool}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-dashboard-muted">
                    {step.done ? "Done" : step.active ? "Preview" : "Queued"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-dashboard-border bg-dashboard-panel p-4">
              <p className="text-xs text-dashboard-muted">Publish target</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {channels.map((channel) => (
                  <div
                    key={channel.initials}
                    className={`flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-medium ${
                      channel.active
                        ? "border-accent bg-accent/10 text-dashboard-text ring-1 ring-accent/40"
                        : "border-dashboard-border text-dashboard-muted"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white ${channel.color}`}
                    >
                      {channel.initials}
                    </span>
                    {channel.name}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 rounded-2xl border border-dashboard-border bg-dashboard-panel p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-dashboard-muted">
                Portfolio · 28d
              </p>
              <p className="mt-1 font-display text-3xl font-semibold text-dashboard-text">
                1.24M
              </p>
              <p className="mt-1 text-sm font-medium text-success">+18% views across channels</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-dashboard/70 px-3 py-2">
                  <p className="text-[11px] text-dashboard-muted">Watch time</p>
                  <p className="text-sm font-semibold text-dashboard-text">94.2K hrs</p>
                </div>
                <div className="rounded-xl bg-dashboard/70 px-3 py-2">
                  <p className="text-[11px] text-dashboard-muted">Revenue</p>
                  <p className="text-sm font-semibold text-dashboard-text">$3,840</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
