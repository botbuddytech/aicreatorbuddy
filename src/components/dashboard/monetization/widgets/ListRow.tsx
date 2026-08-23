import type { ReactNode } from "react";

export function ListRow({
  icon,
  iconClass,
  title,
  subtitle,
  value,
  valueClass,
  highlight = false,
}: {
  icon: ReactNode;
  iconClass: string;
  title: string;
  subtitle: string;
  value: string;
  valueClass?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
        highlight ? "bg-chart-amber/10" : "bg-surface-soft"
      }`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted">{subtitle}</p>
      </div>
      <p className={`shrink-0 text-sm font-semibold ${valueClass ?? "text-foreground"}`}>{value}</p>
    </div>
  );
}
