import { Button } from "@/components/ui/Button";

export function Affiliate() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-[1.75rem] border border-border bg-surface-soft px-6 py-12 text-center sm:px-10">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Love AI Creator Buddy?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted">
          Earn <span className="font-semibold text-foreground">30% recurring commissions</span> for
          life by sharing us with other creators and agencies.
        </p>
        <div className="mt-8 flex justify-center">
          <Button href="#" variant="secondary" className="border-transparent">
            Join Affiliate Program
          </Button>
        </div>
      </div>
    </section>
  );
}
