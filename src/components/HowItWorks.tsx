import { howItWorks } from "@/lib/content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal, RevealItem, RevealStagger } from "@/components/ui/Reveal";

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 border-y border-border bg-surface-soft/60 px-4 py-24 sm:px-6 lg:px-8 lg:py-28"
    >
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <SectionHeading
            align="left"
            eyebrow="How it works"
            title="Six steps. Edit and preview each one."
            description="From ChatGPT script to YouTube publish — with ElevenLabs voice, Seedance visuals, Remotion edit, and VidIQ SEO in between."
          />
        </Reveal>

        <RevealStagger className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {howItWorks.map((item) => (
            <RevealItem
              key={item.step}
              as="article"
              className="glass-card relative overflow-hidden rounded-3xl p-6"
            >
              <span className="pointer-events-none absolute -right-2 -top-4 font-display text-7xl font-semibold text-accent/10">
                {item.step}
              </span>
              <div className="relative">
                <div className="flex items-center gap-3">
                  <span className="font-display text-2xl font-semibold text-accent">
                    {item.step}
                  </span>
                  <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
                    {item.timing}
                  </span>
                </div>
                <p className="mt-5 text-[11px] font-bold uppercase tracking-wide text-muted">
                  {item.tool}
                </p>
                <h3 className="mt-1 font-display text-xl font-semibold tracking-tight text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {item.description}
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealStagger>
      </div>
    </section>
  );
}
