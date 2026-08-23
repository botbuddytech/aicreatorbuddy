"use client";

import { useState } from "react";
import { faqs } from "@/lib/content";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-24 px-4 pb-24 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-28 lg:pt-5">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <SectionHeading eyebrow="FAQ" title="Questions answered" />
        </Reveal>

        <Reveal delay={0.1}>
          <div className="glass-panel mt-14 divide-y divide-white/10 rounded-3xl">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div key={faq.question}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${index}`}
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                  >
                    <h3 className="font-display text-base font-semibold tracking-tight text-foreground sm:text-lg">
                      {faq.question}
                    </h3>
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-lg leading-none text-muted transition-transform ${
                        isOpen ? "rotate-45 bg-accent-soft text-accent" : ""
                      }`}
                    >
                      +
                    </span>
                  </button>
                  <div
                    id={`faq-panel-${index}`}
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-sm leading-relaxed text-muted">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
