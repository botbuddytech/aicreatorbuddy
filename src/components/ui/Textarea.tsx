import type { TextareaHTMLAttributes } from "react";

export function Textarea({
  className = "",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`glass-field w-full rounded-xl border border-white/12 px-3 py-2.5 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted/70 focus:border-accent/50 ${className}`}
      {...rest}
    />
  );
}
