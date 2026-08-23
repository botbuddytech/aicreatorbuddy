"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardUiContext } from "@/components/dashboard/dashboardUi";

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileNavOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [mobileNavOpen]);

  const toggleMobileNav = useCallback(() => {
    setMobileNavOpen((open) => !open);
  }, []);

  const value = useMemo(
    () => ({ mobileNavOpen, setMobileNavOpen, toggleMobileNav }),
    [mobileNavOpen, toggleMobileNav],
  );

  return (
    <DashboardUiContext.Provider value={value}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="min-w-0 flex-1 overflow-x-hidden">{children}</div>
      </div>
    </DashboardUiContext.Provider>
  );
}
