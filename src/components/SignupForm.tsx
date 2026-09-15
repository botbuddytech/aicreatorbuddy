"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "next-auth/react";
import { BrandMark } from "@/components/ui/BrandMark";
import { signUp, type SignUpState } from "@/app/signup/actions";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <BrandMark />
      <span className="leading-tight">
        <span className="block whitespace-nowrap font-display text-base font-semibold tracking-tight text-foreground">
          AI Creator Buddy
        </span>
        <span className="block text-[11px] font-medium text-muted">
          Multi-channel workspace
        </span>
      </span>
    </Link>
  );
}

const fieldClass =
  "glass-field w-full rounded-xl border border-white/12 px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent/60 focus:ring-2 focus:ring-accent/25";

const initialState: SignUpState = {};

export function SignupForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  function continueWithGoogle() {
    if (!googleEnabled) return;
    void signIn("google", { callbackUrl: "/dashboard" });
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <header className="mx-auto flex w-full max-w-lg items-center justify-between px-4 py-6 sm:px-6">
        <Logo />
        <Link
          href="/"
          className="text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          Back to home
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 pb-16 sm:px-6">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-[0_40px_80px_-48px_rgba(0,0,0,0.8)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Get started
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">
            Create your workspace
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Sign up with email to manage every YouTube channel from one place.
          </p>

          <form className="mt-6 space-y-4" action={formAction}>
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                placeholder="Your name"
                className={fieldClass}
              />
              {state.fieldErrors?.name ? (
                <p className="mt-1.5 text-xs text-accent">{state.fieldErrors.name}</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@studio.com"
                className={fieldClass}
              />
              {state.fieldErrors?.email ? (
                <p className="mt-1.5 text-xs text-accent">{state.fieldErrors.email}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                className={fieldClass}
              />
              {state.fieldErrors?.password ? (
                <p className="mt-1.5 text-xs text-accent">{state.fieldErrors.password}</p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="••••••••"
                className={fieldClass}
              />
              {state.fieldErrors?.confirmPassword ? (
                <p className="mt-1.5 text-xs text-accent">{state.fieldErrors.confirmPassword}</p>
              ) : null}
            </div>

            {state.error ? (
              <p className="rounded-xl border border-accent/40 bg-accent-soft px-3 py-2 text-sm text-accent">
                {state.error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold tracking-tight text-white shadow-[0_10px_30px_-12px_rgba(255,59,78,0.65)] transition-colors hover:bg-accent-dark disabled:opacity-70"
            >
              {pending ? "Creating account…" : "Sign up"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wider text-muted">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={continueWithGoogle}
            disabled={!googleEnabled}
            title={googleEnabled ? undefined : "Google sign-in coming soon"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-soft px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GoogleIcon />
            Continue with Google
          </button>
          {!googleEnabled ? (
            <p className="mt-2 text-center text-xs text-muted">Google sign-in coming soon</p>
          ) : null}

          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-accent hover:text-accent-dark">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.5-5.6-5.6S8.9 6.2 12 6.2c1.7 0 2.9.7 3.6 1.4l2.4-2.4C16.7 3.9 14.6 3 12 3 7 3 3 7 3 12s4 9 9 9c5.2 0 8.6-3.6 8.6-8.7 0-.6-.1-1-.1-1.5H12z"
      />
    </svg>
  );
}
