"use client";

import { createContext, useContext } from "react";

export type DashboardUi = {
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
};

export const DashboardUiContext = createContext<DashboardUi | null>(null);

export function useDashboardUi() {
  return useContext(DashboardUiContext);
}
