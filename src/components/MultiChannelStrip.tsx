import { multiChannelStrip } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export function MultiChannelStrip() {
  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8 lg:py-28">
      <Reveal>
        <div className="glass-panel relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] px-6 py-14 sm:px-12 lg:px-16">
          <div className="absolute left-0 top-0 h-full w-1.5 bg-accent" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Multi-channel
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {multiChannelStrip.title}
          </h2>
          <p className="mt-4 max-w-2xl text-base text-muted sm:text-lg">
            {multiChannelStrip.description}
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-3">
            {multiChannelStrip.bullets.map((bullet) => (
              <li
                key={bullet}
                className="glass-card rounded-2xl px-4 py-4 text-sm leading-relaxed text-foreground/90"
              >
                <span className="mb-2 block h-1 w-8 bg-accent" />
                {bullet}
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <Button href="/login" className="px-6 py-3">
              Log in to workspace
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
