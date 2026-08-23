import { blogPosts } from "@/lib/content";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function BlogTeaser() {
  return (
    <section
      id="resources"
      className="scroll-mt-24 border-y border-border bg-surface-soft/50 px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Blog"
          title="Resources"
          description="If you are comparing tools, team workflows, and multi-channel ops, these articles help turn the homepage promise into a concrete publishing system."
        />

        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {blogPosts.map((post, index) => (
            <article
              key={post.title}
              className={`rounded-2xl border border-border bg-surface p-6 ${
                index === 0 ? "md:col-span-2 xl:col-span-1" : ""
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                {post.category}
              </p>
              <h3 className="mt-3 font-display text-lg font-semibold tracking-tight text-foreground">
                {post.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{post.excerpt}</p>
              <div className="mt-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">AI Creator Buddy Team</p>
                  <p className="text-xs text-muted">Multi-channel workspace</p>
                </div>
                <a href="#" className="text-sm font-semibold text-accent hover:text-accent-dark">
                  Read article
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
