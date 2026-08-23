import Link from "next/link";
import type { ReactNode } from "react";

type ButtonProps = {
  href?: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
};

const variants = {
  primary:
    "bg-accent text-white hover:bg-accent-dark shadow-[0_10px_30px_-12px_rgba(225,29,46,0.65)]",
  secondary:
    "border border-white/10 bg-white/5 text-foreground backdrop-blur-sm hover:bg-white/10 hover:border-white/20",
  ghost: "bg-transparent text-foreground hover:bg-white/10",
};

export function Button({
  href = "#",
  children,
  variant = "primary",
  className = "",
}: ButtonProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold tracking-tight transition-colors ${variants[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
