import Link from "next/link";
import { footerColumns } from "@/lib/content";
import { BrandMark } from "@/components/ui/BrandMark";

export function Footer() {
  return (
    <footer className="border-t border-border bg-footer text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5" aria-label="AI Creator Buddy home">
              <BrandMark />
              <span className="font-display text-lg font-semibold tracking-tight">
                AI Creator Buddy
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              Faceless video, many channels. Create with AI, preview every step,
              and publish across your YouTube portfolio.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <p className="text-sm font-semibold text-foreground">{column.title}</p>
                <ul className="mt-4 space-y-2">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      {"href" in link && link.href ? (
                        <Link
                          href={link.href}
                          className="text-sm text-muted transition-colors hover:text-foreground"
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <span className="text-sm text-muted">{link.label}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 AI Creator Buddy. All rights reserved.</p>
          <p>Not affiliated with YouTube or Google LLC.</p>
        </div>
      </div>
    </footer>
  );
}
