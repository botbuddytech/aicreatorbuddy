"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AUTH_STORAGE_KEY } from "@/lib/dashboardContent";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const authed = window.localStorage.getItem(AUTH_STORAGE_KEY) === "1";
    if (!authed) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted">
        Checking session…
      </div>
    );
  }

  return <>{children}</>;
}
