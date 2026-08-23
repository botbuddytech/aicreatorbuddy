import { Topbar } from "@/components/dashboard/Topbar";
import { DonutChart } from "@/components/dashboard/DonutChart";
import { BarList } from "@/components/dashboard/BarList";
import {
  competitorIntel,
  trafficSources,
  workspaceChannels,
} from "@/lib/dashboardContent";

export default function AnalyticsPage() {
  return (
    <>
      <Topbar
        title="Analytics"
        subtitle="Cross-channel performance and competitor intelligence"
      />
      <div className="space-y-6 px-6 py-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <DonutChart
            title="Competitor intelligence"
            subtitle="Share of tracked niche activity across your portfolio"
            total={competitorIntel.total}
            segments={competitorIntel.segments}
            summaries={competitorIntel.summaries}
          />
          <BarList title="Audience traffic mix" items={trafficSources} />
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="font-display text-lg font-semibold text-foreground">
            Per-channel comparison
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                  <th className="pb-3 font-medium">Channel</th>
                  <th className="pb-3 font-medium">Subscribers</th>
                  <th className="pb-3 font-medium">Views</th>
                  <th className="pb-3 font-medium">Revenue</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {workspaceChannels.map((channel) => (
                  <tr key={channel.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ${channel.color}`}
                        >
                          {channel.initials}
                        </span>
                        <span className="font-medium text-foreground">{channel.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-muted">{channel.subscribers}</td>
                    <td className="py-3 text-muted">{channel.views}</td>
                    <td className="py-3 text-muted">{channel.revenue}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          channel.connected
                            ? "bg-success/15 text-success"
                            : "bg-white/5 text-muted"
                        }`}
                      >
                        {channel.connected ? "Live" : "Offline"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
