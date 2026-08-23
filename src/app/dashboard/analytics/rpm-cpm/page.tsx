"use client";

import { RpmCpmSection } from "@/components/dashboard/monetization/sections/RpmCpmSection";
import { useMonetization } from "@/components/dashboard/monetization/MonetizationProvider";

export default function RpmCpmPage() {
  const { data } = useMonetization();
  if (!data) return null;
  return <RpmCpmSection data={data.rpmCpm} />;
}
