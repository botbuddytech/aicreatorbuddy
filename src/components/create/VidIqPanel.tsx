import { Badge } from "@/components/ui/Badge";
import {
  vidiqGradeTone,
  type VidIqGrade,
  type VidIqScriptInsight,
  type VidIqThumbInsight,
  type VidIqTitleInsight,
} from "@/lib/videoProject";

export function VidIqMark() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-chart-blue/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-chart-blue">
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#3b82f6] text-[8px] font-bold text-white">
        VQ
      </span>
      VidIQ
    </span>
  );
}

function Meter({ value, max = 100, label }: { value: number; max?: number; label: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] font-semibold">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums text-foreground">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-chart-blue" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function VidIqTitleStats({ insight }: { insight: VidIqTitleInsight }) {
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-chart-blue/30 bg-chart-blue/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <VidIqMark />
        <div className="flex items-center gap-2">
          <span className="font-display text-xl font-semibold tabular-nums text-foreground">
            {insight.score}
          </span>
          <Badge tone={vidiqGradeTone(insight.grade)}>{insight.grade}</Badge>
        </div>
      </div>
      <Meter value={insight.score} label="SEO score" />
      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
        <div className="rounded-lg bg-surface-soft px-2 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Volume</p>
          <p className="text-xs font-semibold text-foreground">{insight.volume}</p>
        </div>
        <div className="rounded-lg bg-surface-soft px-2 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Comp.</p>
          <p className="text-xs font-semibold text-foreground">{insight.competition}</p>
        </div>
        <div className="rounded-lg bg-surface-soft px-2 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">CTR</p>
          <p className="text-xs font-semibold text-foreground">{insight.predictedCtr}%</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {insight.keywords.map((keyword) => (
          <span
            key={keyword}
            className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-muted"
          >
            {keyword}
          </span>
        ))}
      </div>
    </div>
  );
}

export function VidIqThumbStats({ insight }: { insight: VidIqThumbInsight }) {
  return (
    <div className="mt-3 space-y-2 rounded-xl border border-chart-blue/30 bg-chart-blue/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <VidIqMark />
        <div className="flex items-center gap-2">
          <span className="font-display text-xl font-semibold tabular-nums text-foreground">
            {insight.ctr}%
          </span>
          <Badge tone={vidiqGradeTone(insight.grade)}>{insight.grade}</Badge>
        </div>
      </div>
      <Meter value={insight.ctr} max={12} label="Predicted CTR" />
      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
        <div className="rounded-lg bg-surface-soft px-2 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Contrast</p>
          <p className="text-xs font-semibold text-foreground">{insight.contrast}</p>
        </div>
        <div className="rounded-lg bg-surface-soft px-2 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Text</p>
          <p className="text-xs font-semibold text-foreground">{insight.textDensity}</p>
        </div>
        <div className="rounded-lg bg-surface-soft px-2 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Face</p>
          <p className="text-xs font-semibold text-foreground">
            {insight.facePresent ? "Yes" : "No"}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted">{insight.notes}</p>
    </div>
  );
}

export function VidIqScriptStats({
  insight,
  stale,
}: {
  insight: VidIqScriptInsight;
  stale?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-chart-blue/30 bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="font-display text-base font-semibold text-foreground">VidIQ script score</h4>
          <VidIqMark />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display text-2xl font-semibold tabular-nums text-foreground">
            {insight.score}
          </span>
          <Badge tone={vidiqGradeTone(insight.grade)}>{insight.grade}</Badge>
        </div>
      </div>
      {stale ? (
        <p className="mt-2 text-xs text-chart-amber">
          Script changed since this score — run VidIQ again to refresh.
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted">
          Mock analysis of hook, retention, keyword fit, and CTA. Swap for the real VidIQ API later.
        </p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Meter value={insight.hook} label="Hook" />
        <Meter value={insight.retention} label="Retention" />
        <Meter value={insight.keywordFit} label="Keyword fit" />
        <Meter value={insight.cta} label="CTA" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        <div className="rounded-lg bg-surface-soft px-2 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Words</p>
          <p className="text-xs font-semibold text-foreground">{insight.wordCount}</p>
        </div>
        <div className="rounded-lg bg-surface-soft px-2 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Spoken</p>
          <p className="text-xs font-semibold text-foreground">{insight.spokenMinutes}m</p>
        </div>
        <div className="rounded-lg bg-surface-soft px-2 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Hook</p>
          <p className="text-xs font-semibold text-foreground">{insight.hook}</p>
        </div>
        <div className="rounded-lg bg-surface-soft px-2 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">CTA</p>
          <p className="text-xs font-semibold text-foreground">{insight.cta}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {insight.keywords.map((keyword) => (
          <span
            key={keyword}
            className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-muted"
          >
            {keyword}
          </span>
        ))}
      </div>
      <ul className="mt-3 space-y-1 text-xs text-muted">
        {insight.notes.map((note) => (
          <li key={note}>· {note}</li>
        ))}
      </ul>
    </div>
  );
}

export function VidIqLeaderboard({
  items,
}: {
  items: Array<{ id: string; label: string; value: number; suffix?: string; grade?: VidIqGrade }>;
}) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return (
    <div className="rounded-2xl border border-chart-blue/30 bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-display text-base font-semibold text-foreground">VidIQ lab</h4>
        <VidIqMark />
      </div>
      <p className="mt-1 text-xs text-muted">Mock scores — swap this panel for the real VidIQ API later.</p>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <div key={item.id}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="line-clamp-1 font-medium text-foreground">
                {index + 1}. {item.label}
              </span>
              <span className="shrink-0 tabular-nums text-muted">
                {item.value}
                {item.suffix ?? ""}
                {item.grade ? ` · ${item.grade}` : ""}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-chart-blue"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
