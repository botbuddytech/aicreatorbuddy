"use client";

import { RevenueOverviewSection } from "@/components/dashboard/monetization/sections/RevenueOverviewSection";
import { useMonetization } from "@/components/dashboard/monetization/MonetizationProvider";

export default function RevenueOverviewPage() {
  const { data } = useMonetization();
  if (!data) return null;
  return <RevenueOverviewSection data={data.overview} />;
}
