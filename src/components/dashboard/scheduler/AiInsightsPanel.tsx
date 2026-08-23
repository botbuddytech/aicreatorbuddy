import { aiInsights, type InsightTone } from "@/lib/dashboardContent";

const toneClass: Record<InsightTone, string> = {
  success: "border-success/20 bg-success/10",
  "chart-blue": "border-chart-blue/20 bg-chart-blue/10",
  "chart-amber": "border-chart-amber/20 bg-chart-amber/10",
};

const iconClass: Record<InsightTone, string> = {
  success: "text-success",
  "chart-blue": "text-chart-amber",
  "chart-amber": "text-chart-amber",
};

function InsightIcon({ tone }: { tone: InsightTone }) {
  const common = {
    viewBox: "0 0 24 24",
    className: `h-4 w-4 ${iconClass[tone]}`,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
  } as const;

  if (tone === "success") {
    return (
      <svg {...common}>
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }
  if (tone === "chart-blue") {
    return (
      <svg {...common}>
        <path d="M9 18h6M10 22h4" />
        <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3V18h6v-1c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

export function AiInsightsPanel() {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-purple/15 text-chart-purple">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3l1.6 4.2L18 9l-4.4 1.8L12 15l-1.6-4.2L6 9l4.4-1.8z" />
            <path d="M18 14l.8 2.1L21 17l-2.2.9L18 20l-.8-2.1L15 17l2.2-.9z" />
          </svg>
        </span>
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">AI Insights</h3>
          <p className="mt-0.5 text-sm text-muted">Personalized recommendations.</p>
        </div>
      </div>
      <ul className="mt-4 space-y-3">
        {aiInsights.map((insight) => (
          <li key={insight.id} className={`rounded-xl border p-3 ${toneClass[insight.tone]}`}>
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5">
                <InsightIcon tone={insight.tone} />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{insight.body}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
