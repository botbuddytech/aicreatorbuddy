import { comparisons, otherComparisons } from "@/lib/content";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Compare() {
  return (
    <section id="compare" className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Compare"
          title="Compare AI Creator Buddy vs VidIQ and TubeBuddy"
          description="See how a multi-channel workspace stacks up against single-channel tools →"
        />

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {comparisons.map((item) => (
            <article
              key={item.title}
              className="flex flex-col rounded-2xl border border-border bg-surface p-6"
            >
              <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-muted">{item.subtitle}</p>
              <ul className="mt-5 flex-1 space-y-3">
                {item.points.map((point) => (
                  <li key={point} className="flex gap-2 text-sm leading-relaxed text-foreground/85">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#"
                className="mt-6 text-sm font-semibold text-accent transition-colors hover:text-accent-dark"
              >
                Compare {item.title.split(" vs ")[1]} →
              </a>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {otherComparisons.map((name) => (
            <a
              key={name}
              href="#"
              className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-muted transition-colors hover:border-accent/40 hover:text-foreground"
            >
              vs {name}
            </a>
          ))}
        </div>
        <p className="mt-6 text-center">
          <a href="#" className="text-sm font-semibold text-accent hover:text-accent-dark">
            View all comparisons
          </a>
        </p>
      </div>
    </section>
  );
}
