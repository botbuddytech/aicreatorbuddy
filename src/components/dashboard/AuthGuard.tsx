"use client";

import { useRouter } from "nextjs-toploader/app";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { AUTH_STORAGE_KEY } from "@/lib/dashboardContent";
import { setDemoAuth } from "@/lib/demoAuth.client";
import { DashboardContentSkeleton } from "@/components/ui/skeletons/DashboardContentSkeleton";

function subscribeAuth(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getAuthSnapshot() {
  return window.localStorage.getItem(AUTH_STORAGE_KEY) === "1";
}

function getAuthServerSnapshot() {
  return false;
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const authed = useSyncExternalStore(subscribeAuth, getAuthSnapshot, getAuthServerSnapshot);

  useEffect(() => {
    if (!authed) {
      router.replace("/login");
      return;
    }
    // Sessions created before the cookie mirror existed: refresh the cookie so
    // server routes (YouTube OAuth, server actions) see the login too.
    setDemoAuth();
  }, [authed, router]);

  if (!authed) {
    return <DashboardContentSkeleton label="Loading dashboard" />;
  }

  return <>{children}</>;
}
