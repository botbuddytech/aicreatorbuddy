"use client";

import Link from "next/link";
import { useState } from "react";
import { brandTagline, navLinks } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/ui/BrandMark";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="AI Creator Buddy home">
      <BrandMark />
      <span className="leading-tight">
        <span className="block whitespace-nowrap font-display text-base font-semibold tracking-tight text-foreground">
          AI Creator Buddy
        </span>
        <span className="block text-[11px] font-medium text-muted">
          {brandTagline}
        </span>
      </span>
    </Link>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-white/10 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Button href="/login" variant="ghost" className="px-3">
            Sign in
          </Button>
          <Button href="/login" className="shadow-[0_10px_30px_-12px_rgba(255,59,78,0.75)]">
            Log in
          </Button>
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface lg:hidden"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">Menu</span>
          <div className="relative h-4 w-5">
            <span
              className={`absolute left-0 top-0 block h-0.5 w-5 bg-foreground transition ${
                open ? "top-1.5 rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-1.5 block h-0.5 w-5 bg-foreground transition ${
                open ? "opacity-0" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-3 block h-0.5 w-5 bg-foreground transition ${
                open ? "top-1.5 -rotate-45" : ""
              }`}
            />
          </div>
        </button>
      </div>

      {open ? (
        <div className="border-t border-border bg-surface px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-soft"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Button href="/login" variant="secondary">
              Sign in
            </Button>
            <Button href="/login">Log in</Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
