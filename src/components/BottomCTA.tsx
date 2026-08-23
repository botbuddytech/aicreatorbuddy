import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export function BottomCTA() {
  return (
    <section className="px-4 pb-24 sm:px-6 lg:px-8 lg:pb-28">
      <Reveal>
        <div className="glass-panel relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] px-6 py-16 text-center sm:px-12">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-accent" aria-hidden />
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/25 blur-3xl" aria-hidden />
          <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Get started
          </p>
          <h2 className="relative mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Ready to create faceless videos for every channel?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-muted">
            Log in with the demo account and walk the full pipeline — edit and preview
            included.
          </p>
          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button href="/login" className="px-6 py-3 text-base">
              Log in
            </Button>
            <Button href="#pricing" variant="secondary" className="px-6 py-3 text-base">
              See plans
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
