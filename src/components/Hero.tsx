"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { TypewriterHeadline } from "@/components/TypewriterHeadline";
import { Button } from "@/components/ui/Button";
import { DashboardMock } from "@/components/DashboardMock";
import { heroCopy } from "@/lib/content";

export function Hero() {
  const reduce = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (reduce) {
      video.pause();
      video.removeAttribute("autoplay");
    } else {
      void video.play().catch(() => {
        /* autoplay may be blocked; muted loop still fine when user interacts */
      });
    }
  }, [reduce]);

  return (
    <section className="hero-cinematic relative overflow-x-clip pb-16 sm:pb-20 lg:pb-24">
      {/* Full-viewport video plate */}
      <div className="hero-media hero-media--viewport" aria-hidden>
        <div className="hero-media__fallback" />
        {!reduce ? (
          <video
            ref={videoRef}
            className="hero-media__video"
            src="/media/hero_video.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : null}
        <div className="hero-media__vignette" />
        <div className="hero-media__grain" />
        <div className="hero-media__letterbox" />
        <div className="hero-media__scrim" />
        <div className="hero-media__bridge" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-7xl flex-col px-4 pt-24 sm:px-6 sm:pt-28 lg:px-8">
        {/* Headline + CTAs — upper band over video */}
        <div className="flex flex-1 flex-col items-center justify-center pb-16 text-center sm:pb-20 lg:pb-24">
          <TypewriterHeadline className="font-display max-w-5xl text-center text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl lg:leading-[1.08]" />
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg">
            {heroCopy.subcopy}
          </p>
          <motion.div
            className="mt-8 mb-10 flex flex-wrap items-center justify-center gap-3 sm:mb-14 lg:mb-16"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 1.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <Button href="/login" className="min-w-[160px] px-6 py-3 text-base">
              Log in
            </Button>
            <Button href="#pricing" variant="secondary" className="px-6 py-3 text-base">
              View pricing
            </Button>
          </motion.div>
        </div>

        {/* Dashboard overlays video end, then sits into page background */}
        <motion.div
          className="hero-dashboard-overlap relative z-20 mx-auto mt-2 w-full sm:mt-4"
          initial={reduce ? false : { opacity: 0, y: 40 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 2.1, ease: [0.22, 1, 0.36, 1] }}
          whileHover={reduce ? undefined : { y: -4, transition: { duration: 0.35 } }}
        >
          <DashboardMock className="max-w-6xl lg:max-w-7xl" />
        </motion.div>
      </div>
    </section>
  );
}
