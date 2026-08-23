"use client";

import { MonetizationLayout } from "@/components/dashboard/monetization/MonetizationLayout";

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <MonetizationLayout>{children}</MonetizationLayout>;
}
