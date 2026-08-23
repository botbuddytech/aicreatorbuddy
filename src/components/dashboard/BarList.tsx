import Link from "next/link";
import type { ReactNode } from "react";

type BarItem = {
  label: string;
  value: number;
  color: string;
  icon?: ReactNode;
};

export function BarList({
  title,
  subtitle,
  href,
  badge,
  footer,
  items,
  valueSuffix = "%",
  maxValue,
  formatValue,
}: {
  title?: string;
  subtitle?: string;
  href?: string;
  badge?: ReactNode;
  footer?: string;
  items: readonly BarItem[];
  valueSuffix?: string;
  maxValue?: number;
  formatValue?: (value: number) => string;
}) {
  const max = maxValue ?? Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      {title ? (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
          </div>
          {badge ? <div className="shrink-0">{badge}</div> : null}
          {href ? (
            <Link
              href={href}
              className="shrink-0 text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              See all
            </Link>
          ) : null}
        </div>
      ) : null}
      <ul className={`space-y-4 ${title ? "mt-5" : ""}`}>
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-3">
            {item.icon ? (
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-base">
                {item.icon}
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground">{item.label}</span>
                <span className="font-medium text-muted">
                  {formatValue ? formatValue(item.value) : `${item.value}${valueSuffix}`}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-soft">
                <div
                  className={`h-full rounded-full ${item.color}`}
                  style={{ width: `${(item.value / max) * 100}%` }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
      {footer ? <p className="mt-4 text-xs text-muted">{footer}</p> : null}
    </div>
  );
}
