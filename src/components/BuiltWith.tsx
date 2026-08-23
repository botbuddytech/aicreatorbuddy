"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { builtWithRows } from "@/lib/content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

type PlayingKey = string | null;

function rowKey(rowTitle: string, videoId: string) {
  return `${rowTitle}::${videoId}`;
}

function RailRow({
  title,
  videos,
  playing,
  onPlay,
}: {
  title: string;
  videos: readonly { id: string; title: string; channel: string }[];
  playing: PlayingKey;
  onPlay: (key: string) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  const scrollByCards = useCallback((direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    const amount = Math.min(rail.clientWidth * 0.85, 720);
    rail.scrollBy({ left: direction * amount, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const onWheel = (event: WheelEvent) => {
      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (delta === 0) return;
      const maxScroll = rail.scrollWidth - rail.clientWidth;
      if (maxScroll <= 0) return;
      event.preventDefault();
      rail.scrollLeft += delta;
    };

    rail.addEventListener("wheel", onWheel, { passive: false });
    return () => rail.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div className="w-full min-w-0">
      <div className="mx-auto mb-3 flex max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <h3 className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={`Scroll ${title} left`}
            onClick={() => scrollByCards(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-foreground transition hover:border-accent/40 hover:bg-accent/15"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={`Scroll ${title} right`}
            onClick={() => scrollByCards(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-foreground transition hover:border-accent/40 hover:bg-accent/15"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        className="built-with__rail no-scrollbar flex w-full min-w-0 gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain px-4 pb-3 sm:gap-4 sm:px-6 lg:px-8"
      >
        {videos.map((video) => {
          const key = rowKey(title, video.id);
          const isPlaying = playing === key;

          return (
            <article
              key={key}
              className="built-with__card group relative w-[42vw] max-w-[280px] shrink-0 grow-0 basis-[42vw] overflow-hidden rounded-xl sm:w-[220px] sm:basis-[220px] md:w-[240px] md:basis-[240px] lg:w-[260px] lg:basis-[260px]"
            >
              <div className="relative aspect-video bg-black">
                {isPlaying ? (
                  <iframe
                    title={video.title}
                    src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                    className="absolute inset-0 h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`}
                      alt={video.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                      loading="lazy"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <button
                      type="button"
                      className="absolute inset-0 flex items-center justify-center"
                      onClick={() => onPlay(key)}
                      aria-label={`Play ${video.title}`}
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-[0_10px_30px_-10px_rgba(255,59,78,0.9)] transition group-hover:scale-110 sm:h-11 sm:w-11">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3.5 w-3.5 translate-x-0.5 sm:h-4 sm:w-4"
                          fill="currentColor"
                          aria-hidden
                        >
                          <path d="M8 5.5v13l11-6.5L8 5.5z" />
                        </svg>
                      </span>
                    </button>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2.5 sm:p-3">
                      <p className="truncate text-xs font-semibold text-white sm:text-sm">
                        {video.title}
                      </p>
                      <p className="truncate text-[10px] text-white/70 sm:text-xs">
                        {video.channel}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function BuiltWith() {
  const [playing, setPlaying] = useState<PlayingKey>(null);

  return (
    <section
      id="built-with"
      className="built-with relative scroll-mt-24 overflow-x-clip border-y border-border py-24 lg:py-28"
    >
      <div className="built-with__glow" aria-hidden />
      <div className="built-with__grain" aria-hidden />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            align="left"
            eyebrow="Showcase"
            title="Built with AI Creator Buddy"
          />
        </Reveal>
      </div>

      <div className="relative z-10 mt-12 w-full min-w-0 space-y-10">
        {builtWithRows.map((row, rowIndex) => (
          <Reveal
            key={row.title}
            delay={0.06 * rowIndex}
            className="w-full min-w-0 max-w-full"
          >
            <RailRow
              title={row.title}
              videos={row.videos}
              playing={playing}
              onPlay={setPlaying}
            />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
