import { testimonials } from "@/lib/content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal, RevealItem, RevealStagger } from "@/components/ui/Reveal";

export function Testimonials() {
  return (
    <section className="px-4 pb-24 pt-8 sm:px-6 sm:pt-10 lg:px-8 lg:pb-28 lg:pt-11">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <SectionHeading
            align="left"
            eyebrow="Social proof"
            title="Trusted by multi-channel teams"
            description="Creators and agencies use AI Creator Buddy to ship faceless videos and run every channel from one workspace."
          />
        </Reveal>

        <RevealStagger className="mt-14 grid gap-5 lg:grid-cols-3">
          {testimonials.map((item) => (
            <RevealItem
              key={item.name}
              as="article"
              className="glass-card flex flex-col rounded-3xl p-6 lg:p-7"
            >
              <span className="font-display text-4xl leading-none text-accent/80" aria-hidden>
                “
              </span>
              <blockquote className="mt-3 flex-1 text-base leading-relaxed text-foreground/90">
                {item.quote}
              </blockquote>
              <div className="mt-6 border-t border-border pt-4">
                <p className="font-semibold text-foreground">{item.name}</p>
                <p className="mt-0.5 text-sm text-muted">{item.role}</p>
              </div>
            </RevealItem>
          ))}
        </RevealStagger>
      </div>
    </section>
  );
}
