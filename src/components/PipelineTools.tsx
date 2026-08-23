import { pipelineTools } from "@/lib/content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal, RevealItem, RevealStagger } from "@/components/ui/Reveal";

export function PipelineTools() {
  return (
    <section
      id="tools"
      className="scroll-mt-24 border-y border-border bg-surface-soft/50 px-4 pb-24 pt-8 sm:px-6 sm:pt-10 lg:px-8 lg:pb-28 lg:pt-11"
    >
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <SectionHeading
            align="left"
            eyebrow="Tools"
            title="Your production stack, wired together"
            description="Mock integrations for ChatGPT, ElevenLabs, Seedance, Remotion, VidIQ, and YouTube — ready to explore in the dashboard."
          />
        </Reveal>
        <RevealStagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pipelineTools.map((tool) => (
            <RevealItem
              key={tool.name}
              as="article"
              className="glass-card flex items-center gap-4 rounded-3xl p-5"
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold text-white ${tool.color}`}
              >
                {tool.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {tool.name}
                </h3>
                <p className="text-sm text-muted">{tool.role}</p>
              </div>
            </RevealItem>
          ))}
        </RevealStagger>
      </div>
    </section>
  );
}
