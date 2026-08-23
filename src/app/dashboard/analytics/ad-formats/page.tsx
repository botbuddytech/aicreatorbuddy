"use client";

import { AdFormatsSection } from "@/components/dashboard/monetization/sections/AdFormatsSection";
import { useMonetization } from "@/components/dashboard/monetization/MonetizationProvider";

export default function AdFormatsPage() {
  const { data } = useMonetization();
  if (!data) return null;
  return <AdFormatsSection data={data.adFormats} />;
}
