"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PlaceholderImage } from "@/components/create/PlaceholderImage";
import { recentUploads, type UploadStatus } from "@/lib/dashboardContent";

const FILTERS: { id: "all" | UploadStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "live", label: "Live" },
  { id: "scheduled", label: "Scheduled" },
  { id: "draft", label: "Drafts" },
];

export function RecentUploads() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const items = useMemo(
    () => (filter === "all" ? recentUploads : recentUploads.filter((item) => item.status === filter)),
    [filter],
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Recent uploads</h3>
          <p className="mt-1 text-sm text-muted">Latest videos across every connected channel</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-accent text-white"
                    : "border border-border text-muted hover:bg-white/5 hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <Link
            href="/dashboard/create"
            className="text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            View all
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-5 py-10 text-center text-sm text-muted">
          No uploads in this filter.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((video) => (
            <article
              key={video.id}
              className="overflow-hidden rounded-2xl border border-border bg-surface"
            >
              <div className="relative">
                <PlaceholderImage label={video.title} className="aspect-video w-full rounded-none" />
                <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {video.duration}
                </span>
                {video.status === "live" ? (
                  <span className="absolute left-2 top-2 rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Live
                  </span>
                ) : null}
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <h4 className="line-clamp-2 text-sm font-semibold text-foreground">{video.title}</h4>
                  <p className="mt-1 text-xs text-muted">{video.meta}</p>
                </div>
                {video.status === "published" ? (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span>{video.views} views</span>
                    <span>{video.likes} likes</span>
                    <span>{video.comments} comments</span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-semibold ${
                        video.vsAvgPositive
                          ? "bg-success/15 text-success"
                          : "bg-chart-amber/15 text-chart-amber"
                      }`}
                    >
                      {video.vsAvg} vs avg
                    </span>
                  </div>
                ) : null}
                {video.status === "live" ? (
                  <p className="text-xs font-medium text-accent">
                    {video.watching} watching · {video.peak}
                  </p>
                ) : null}
                {video.status === "scheduled" ? (
                  <span className="inline-flex rounded-full bg-chart-blue/15 px-2.5 py-1 text-[11px] font-semibold text-chart-blue">
                    {video.scheduledFor}
                  </span>
                ) : null}
                {video.status === "draft" ? (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-[11px]">
                      <span className="rounded-full bg-chart-amber/15 px-2 py-0.5 font-semibold text-chart-amber">
                        Draft
                      </span>
                      <span className="text-muted">{video.draftProgress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-soft">
                      <div
                        className="h-full rounded-full bg-chart-amber"
                        style={{ width: `${video.draftProgress ?? 0}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
