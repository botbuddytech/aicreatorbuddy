import { painPoints } from "@/lib/content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal, RevealItem, RevealStagger } from "@/components/ui/Reveal";

export function PainPoints() {
  return (
    <section className="px-4 pb-24 pt-8 sm:px-6 sm:pt-10 lg:px-8 lg:pb-28 lg:pt-11">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <SectionHeading
            align="left"
            eyebrow="Stop wasting time"
            title="Say goodbye to manual work"
            description="Hours of repetitive production and channel hopping collapse into one editable pipeline."
          />
        </Reveal>
        <RevealStagger className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {painPoints.map((item, index) => (
            <RevealItem key={item.title} as="article" className="glass-card rounded-3xl p-6">
              <span className="font-display text-sm font-semibold text-accent">
                0{index + 1}
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {item.description}
              </p>
            </RevealItem>
          ))}
        </RevealStagger>
      </div>
    </section>
  );
}
