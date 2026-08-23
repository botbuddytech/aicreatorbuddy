import type { SelectHTMLAttributes } from "react";

export function Select({
  className = "",
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`glass-field w-full rounded-xl border border-white/12 px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent/50 ${className}`}
      {...rest}
    >
      {children}
    </select>
  );
}
