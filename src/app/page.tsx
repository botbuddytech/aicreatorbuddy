import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { ResultsStrip } from "@/components/ResultsStrip";
import { Features } from "@/components/Features";
import { BuiltWith } from "@/components/BuiltWith";
import { HowItWorks } from "@/components/HowItWorks";
import { PainPoints } from "@/components/PainPoints";
import { PipelineTools } from "@/components/PipelineTools";
import { MultiChannelStrip } from "@/components/MultiChannelStrip";
import { Testimonials } from "@/components/Testimonials";
import { Pricing } from "@/components/Pricing";
import { FAQ } from "@/components/FAQ";
import { BottomCTA } from "@/components/BottomCTA";
import { Footer } from "@/components/Footer";
import { getLandingJsonLd, jsonLdScript, siteConfig } from "@/lib/seo";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: "/",
    title: siteConfig.title,
    description: siteConfig.description,
  },
};

export default function Home() {
  const jsonLd = getLandingJsonLd();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      <a
        href="#main-content"
        className="sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:m-0 focus:inline-flex focus:h-auto focus:w-auto focus:overflow-visible focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-foreground"
      >
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" className="flex-1">
        <Hero />
        <ResultsStrip />
        <Features />
        <BuiltWith />
        <HowItWorks />
        <PainPoints />
        <PipelineTools />
        <MultiChannelStrip />
        <Testimonials />
        <Pricing />
        <FAQ />
        <BottomCTA />
      </main>
      <Footer />
    </>
  );
}
