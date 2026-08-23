import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
};

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-dark",
  secondary: "border border-border text-foreground hover:bg-white/5",
  ghost: "text-foreground hover:bg-white/5",
  danger: "border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20",
};

const sizes: Record<Size, string> = {
  sm: "rounded-lg px-3 py-1.5 text-xs font-semibold",
  md: "rounded-xl px-4 py-2 text-sm font-semibold",
};

export function ActionButton({
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: ActionButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? (loadingLabel ?? "Working…") : children}
    </button>
  );
}
