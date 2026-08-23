import { resultStats } from "@/lib/content";
import { RevealItem, RevealStagger } from "@/components/ui/Reveal";

export function ResultsStrip() {
  return (
    <section
      aria-label="Results"
      className="border-y border-border/60 px-4 py-8 sm:px-6 lg:px-8"
    >
      <RevealStagger className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {resultStats.map((stat) => (
          <RevealItem
            key={stat.label}
            className="glass-card rounded-3xl px-6 py-10 text-center sm:px-8 sm:text-left"
          >
            <p className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {stat.value}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{stat.label}</p>
            <div className="mx-auto mt-4 h-0.5 w-10 bg-accent sm:mx-0" />
          </RevealItem>
        ))}
      </RevealStagger>
    </section>
  );
}
