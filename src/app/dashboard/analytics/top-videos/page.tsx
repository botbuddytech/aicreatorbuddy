"use client";

import { TopEarningVideosSection } from "@/components/dashboard/monetization/sections/TopEarningVideosSection";
import { useMonetization } from "@/components/dashboard/monetization/MonetizationProvider";

export default function TopEarningVideosPage() {
  const { data } = useMonetization();
  if (!data) return null;
  return <TopEarningVideosSection data={data.topVideos} />;
}
