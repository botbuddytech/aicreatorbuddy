import type { InputHTMLAttributes } from "react";

const UNSTYLED_TYPES = new Set([
  "checkbox",
  "radio",
  "range",
  "file",
  "hidden",
  "color",
  "button",
  "submit",
  "reset",
  "image",
]);

export function Input({
  className = "",
  type = "text",
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  const filled = !UNSTYLED_TYPES.has(type);

  return (
    <input
      type={type}
      className={
        filled
          ? `glass-field w-full rounded-xl border border-white/12 px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted/70 focus:border-accent/50 ${className}`
          : `w-full accent-accent ${className}`
      }
      {...rest}
    />
  );
}
