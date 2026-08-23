import { pricingPlans } from "@/lib/content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { Reveal, RevealItem, RevealStagger } from "@/components/ui/Reveal";

export function Pricing() {
  return (
    <section
      id="pricing"
      className="scroll-mt-24 border-y border-border bg-surface-soft/40 px-4 py-24 sm:px-6 lg:px-8 lg:py-28"
    >
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <SectionHeading
            eyebrow="Pricing"
            title="Simple, transparent pricing"
            description="No hidden fees. Pick BYOK for lean spend, or included minutes when you want channels and generation bundled."
          />
        </Reveal>

        <RevealStagger className="mt-14 grid gap-5 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <RevealItem
              key={plan.name}
              as="article"
              className={`glass-card relative flex flex-col rounded-3xl p-7 ${
                plan.highlighted ? "glass-card--accent ring-1 ring-accent/40" : ""
              }`}
            >
              {plan.highlighted ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                  Most popular
                </span>
              ) : null}

              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                {plan.name}
              </h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-4xl font-semibold tracking-tight text-foreground lg:text-5xl">
                  {plan.price}
                </span>
                <span className="text-sm text-muted">{plan.period}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{plan.blurb}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-foreground/90">
                    <span className="mt-0.5 text-success" aria-hidden>
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button
                  href="/login"
                  variant={plan.highlighted ? "primary" : "secondary"}
                  className="w-full"
                >
                  {plan.cta}
                </Button>
              </div>
            </RevealItem>
          ))}
        </RevealStagger>

        <Reveal delay={0.15}>
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted">
            BYOK plans bill AI providers (OpenAI, ElevenLabs, etc.) separately. Included
            minutes on Growth and Scale are platform generation allotments. Demo checkout
            is not connected — CTAs open the login workspace.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
