import type { ReactNode } from "react";

export type BadgeTone = "muted" | "amber" | "blue" | "success" | "accent";

const tones: Record<BadgeTone, string> = {
  muted: "bg-white/5 text-muted",
  amber: "bg-chart-amber/15 text-chart-amber",
  blue: "bg-chart-blue/15 text-chart-blue",
  success: "bg-success/15 text-success",
  accent: "bg-accent/15 text-accent",
};

const sizes = {
  md: "px-2.5 py-1 text-[11px]",
  sm: "px-2 py-0.5 text-[10px] leading-none",
};

export function Badge({
  tone = "muted",
  size = "md",
  children,
  className = "",
}: {
  tone?: BadgeTone;
  size?: "sm" | "md";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${sizes[size]} ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
