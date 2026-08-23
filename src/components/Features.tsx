import { features } from "@/lib/content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal, RevealItem, RevealStagger } from "@/components/ui/Reveal";

const badgeStyles: Record<string, string> = {
  Create: "bg-accent-soft text-accent",
  Channels: "bg-chart-blue/15 text-chart-blue",
  Grow: "bg-success/15 text-success",
};

export function Features() {
  return (
    <section
      id="features"
      className="scroll-mt-24 px-4 py-24 sm:px-6 lg:px-8 lg:py-28"
    >
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <SectionHeading
            align="left"
            eyebrow="Features"
            title="Faceless creation. Multi-channel control."
            description="Automate script-to-video production, preview every stage, then publish and manage every YouTube channel from one dark, focused workspace."
          />
        </Reveal>

        <RevealStagger className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {features.map((feature, index) => (
            <RevealItem
              key={feature.title}
              as="article"
              className={`glass-card group rounded-3xl p-6 ${
                index === 0 ? "xl:col-span-2 xl:p-8" : ""
              }`}
            >
              <span
                className={`rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide ${badgeStyles[feature.badge]}`}
              >
                {feature.badge}
              </span>
              <h3
                className={`mt-4 font-display font-semibold tracking-tight text-foreground ${
                  index === 0 ? "text-2xl lg:text-3xl" : "text-xl"
                }`}
              >
                {feature.title}
              </h3>
              <p
                className={`mt-2 leading-relaxed text-muted ${
                  index === 0 ? "max-w-2xl text-base" : "text-sm"
                }`}
              >
                {feature.description}
              </p>
            </RevealItem>
          ))}
        </RevealStagger>
      </div>
    </section>
  );
}
