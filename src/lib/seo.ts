import { faqs, pricingPlans } from "@/lib/content";

function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(/\/$/, "");
  if (vercel) return `https://${vercel}`;

  const railway = process.env.RAILWAY_PUBLIC_DOMAIN?.replace(/\/$/, "");
  if (railway) return `https://${railway}`;

  return "https://aicreatorbuddy.app";
}

export const siteConfig = {
  name: "AI Creator Buddy",
  tagline: "Faceless video, many channels",
  title: "AI Creator Buddy — Faceless YouTube Video Automation",
  description:
    "Generate faceless YouTube videos with AI voice, scenes, and SEO tagging — then preview every step and publish across every channel from one workspace.",
  url: resolveSiteUrl(),
  locale: "en_US",
  keywords: [
    "faceless YouTube videos",
    "YouTube automation",
    "AI video generator",
    "multi-channel YouTube",
    "AI voiceover",
    "faceless channel",
    "YouTube SEO",
    "script to video",
  ],
} as const;

export function jsonLdScript(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function getLandingJsonLd() {
  const { url, name, description, tagline } = siteConfig;
  const organizationId = `${url}/#organization`;
  const websiteId = `${url}/#website`;
  const appId = `${url}/#app`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name,
        url,
        description,
        slogan: tagline,
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        url,
        name,
        description,
        publisher: { "@id": organizationId },
        inLanguage: "en-US",
      },
      {
        "@type": "WebPage",
        "@id": `${url}/#webpage`,
        url,
        name: siteConfig.title,
        description,
        isPartOf: { "@id": websiteId },
        about: { "@id": appId },
        inLanguage: "en-US",
      },
      {
        "@type": "SoftwareApplication",
        "@id": appId,
        name,
        url,
        description,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web",
        offers: pricingPlans.map((plan) => ({
          "@type": "Offer",
          name: `${plan.name} plan`,
          price: plan.price.replace("$", ""),
          priceCurrency: "USD",
          description: plan.blurb,
        })),
        publisher: { "@id": organizationId },
      },
      {
        "@type": "FAQPage",
        "@id": `${url}/#faq`,
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  };
}
