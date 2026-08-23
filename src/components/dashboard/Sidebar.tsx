"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { memo, useEffect, useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { useDashboardUi } from "@/components/dashboard/dashboardUi";
import {
  AUTH_STORAGE_KEY,
  SIDEBAR_COLLAPSED_KEY,
  demoProfile,
  navItems,
  upcomingProcessingCount,
  type NavChild,
  type NavItem,
} from "@/lib/dashboardContent";
import { draftVideoCount } from "@/lib/contentLibrary";
import { BrandMark } from "@/components/ui/BrandMark";

const icons: Record<string, ReactNode> = {
  Overview: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  Channels: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Monetization: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  "Revenue Overview": (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M2 10h20M6 15h2M12 15h2" />
    </svg>
  ),
  "RPM / CPM Insights": (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19V5M4 19l6-6 4 4 8-10" />
      <path d="M16 7h4v4" />
    </svg>
  ),
  "Top Earning Videos": (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 4H5a3 3 0 0 0 3 3M17 4h2a3 3 0 0 1-3 3" />
    </svg>
  ),
  "Ad Formats Breakdown": (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  "Create Video": (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  "Content Library": (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M8 5V3M16 5V3M3 10h18" />
    </svg>
  ),
  "All Videos": (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 10l4.55-2.27A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.89L15 14" />
      <rect x="3" y="6" width="12" height="12" rx="2" />
    </svg>
  ),
  Drafts: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </svg>
  ),
  Scheduled: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  Playlists: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  ),
  "Video Scheduler": (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  Calendar: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  ),
  "Upcoming Uploads": (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18h6M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3V18h6v-1c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z" />
    </svg>
  ),
  "Best Time To Post": (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  "AI Integrations": (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  ),
  Analytics: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  ),
};

function navActive(href: string, pathname: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function childBadge(child: NavChild) {
  if (child.badge === "drafts" && draftVideoCount > 0) {
    return { count: draftVideoCount, className: "bg-chart-amber/15 text-chart-amber" };
  }
  if (child.badge === "upcoming" && upcomingProcessingCount > 0) {
    return { count: upcomingProcessingCount, className: "bg-chart-blue/15 text-chart-blue" };
  }
  return null;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function NavDropdown({ item, pathname }: { item: NavItem; pathname: string }) {
  const submenuId = useId();
  const sectionActive = navActive(item.href, pathname, item.exact);
  const [open, setOpen] = useState(sectionActive);

  const children = item.children ?? [];
  const rowClass = `flex items-center rounded-xl text-sm font-medium transition-colors ${
    sectionActive
      ? "bg-accent/15 text-accent"
      : "text-muted hover:bg-white/5 hover:text-foreground"
  }`;

  return (
    <div>
      <div className={rowClass}>
        <Link href={item.href} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-1 pl-3">
          {icons[item.label]}
          <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={submenuId}
          aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
          onClick={() => setOpen((current) => !current)}
          className="mr-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
        >
          <Chevron open={open} />
        </button>
      </div>
      <div
        id={submenuId}
        role="group"
        aria-label={item.label}
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden" inert={!open} aria-hidden={!open}>
          <div className="mt-1 ml-5 space-y-0.5 border-l border-border pl-3">
            {children.map((child) => {
              const childActive = navActive(child.href, pathname, child.exact);
              const badge = childBadge(child);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={`relative flex items-center gap-2.5 rounded-xl py-2 pr-3 pl-3 text-sm font-medium transition-colors ${
                    childActive
                      ? "bg-accent/15 text-accent"
                      : "text-muted hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  {childActive ? (
                    <span className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full bg-accent" />
                  ) : null}
                  {icons[child.label]}
                  <span className="min-w-0 flex-1 truncate">{child.label}</span>
                  {badge ? (
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                      {badge.count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const collapsedListeners = new Set<() => void>();

function subscribeCollapsed(onChange: () => void) {
  collapsedListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    collapsedListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getCollapsedSnapshot() {
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
}

function getCollapsedServerSnapshot() {
  return false;
}

function writeCollapsed(next: boolean) {
  window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
  collapsedListeners.forEach((listener) => listener());
}

function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const ui = useDashboardUi();
  const mobileOpen = ui?.mobileNavOpen ?? false;
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot,
  );

  useEffect(() => {
    function syncSidebarWidth() {
      const desktop = window.matchMedia("(min-width: 1024px)").matches;
      document.documentElement.style.setProperty(
        "--sidebar-width",
        desktop ? (collapsed ? "4rem" : "16rem") : "0px",
      );
    }
    syncSidebarWidth();
    window.addEventListener("resize", syncSidebarWidth);
    return () => window.removeEventListener("resize", syncSidebarWidth);
  }, [collapsed]);

  function toggleCollapsed() {
    writeCollapsed(!collapsed);
  }

  function logout() {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    router.push("/");
  }

  const widthClass = collapsed ? "w-16" : "w-64";
  const settingsActive = pathname.startsWith("/dashboard/settings");

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/55 lg:hidden"
          onClick={() => ui?.setMobileNavOpen(false)}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-surface transition-[transform,width] duration-200 ease-out lg:z-30 ${
          collapsed ? "lg:w-16" : "lg:w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className={`border-b border-border ${collapsed ? "px-2 py-4" : "px-5 py-5"}`}>
          <Link
            href="/"
            className={`flex items-center rounded-xl outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-accent/50 ${
              collapsed ? "justify-center" : "gap-2.5"
            }`}
            title={collapsed ? "AI Creator Buddy" : undefined}
          >
            <BrandMark />
            {collapsed ? (
              <span className="sr-only">AI Creator Buddy</span>
            ) : (
              <div>
                <p className="whitespace-nowrap font-display text-sm font-semibold text-foreground">AI Creator Buddy</p>
                <p className="text-[11px] text-muted">Workspace</p>
              </div>
            )}
          </Link>
        </div>

        <nav className={`flex-1 space-y-1 overflow-y-auto py-4 ${collapsed ? "px-2" : "px-3"}`}>
          {navItems.map((item) => {
            if (item.children && !collapsed) {
              return (
                <NavDropdown
                  key={`${item.href}:${navActive(item.href, pathname, item.exact) ? "in" : "out"}`}
                  item={item}
                  pathname={pathname}
                />
              );
            }

            const active = navActive(item.href, pathname, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center rounded-xl py-2.5 text-sm font-medium transition-colors ${
                  collapsed ? "justify-center px-0" : "gap-3 px-3"
                } ${
                  active
                    ? "bg-accent/15 text-accent"
                    : "text-muted hover:bg-white/5 hover:text-foreground"
                }`}
              >
                {icons[item.label]}
                {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
              </Link>
            );
          })}
        </nav>

        <div className={`mt-auto space-y-2 border-t border-border ${collapsed ? "p-2" : "p-3"}`}>
          <Link
            href="/dashboard/settings"
            title={collapsed ? "Profile settings" : undefined}
            className={`flex w-full items-center rounded-xl py-2 text-sm transition-colors ${
              collapsed ? "justify-center px-0" : "gap-3 px-2"
            } ${
              settingsActive
                ? "bg-accent/15 text-accent"
                : "text-muted hover:bg-white/5 hover:text-foreground"
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[11px] font-bold text-accent">
              {demoProfile.initials}
            </span>
            {collapsed ? (
              <span className="sr-only">Profile settings</span>
            ) : (
              <span className="min-w-0 flex-1 text-left">
                <span className={`block truncate font-semibold ${settingsActive ? "" : "text-foreground"}`}>
                  {demoProfile.name}
                </span>
                <span className="block truncate text-[11px] text-muted">Profile settings</span>
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={logout}
            title={collapsed ? "Log out" : undefined}
            className={`flex w-full items-center rounded-xl border border-border text-sm font-semibold text-muted transition-colors hover:bg-white/5 hover:text-foreground ${
              collapsed ? "justify-center px-0 py-2.5" : "justify-center px-3 py-2.5"
            }`}
          >
            {collapsed ? (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span className="sr-only">Log out</span>
              </>
            ) : (
              "Log out"
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute top-7 -right-3 z-40 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-sm transition-colors hover:bg-white/5 hover:text-foreground lg:flex"
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 transition-transform ${collapsed ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </aside>
      <div className={`hidden shrink-0 transition-[width] duration-200 ease-out lg:block ${widthClass}`} aria-hidden />
    </>
  );
}

export const Sidebar = memo(SidebarNav);
Sidebar.displayName = "Sidebar";
