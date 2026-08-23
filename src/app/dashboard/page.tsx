import { Topbar } from "@/components/dashboard/Topbar";
import { OverviewDashboard } from "@/components/dashboard/OverviewDashboard";

export default function DashboardOverviewPage() {
  return (
    <>
      <Topbar
        title="Overview"
        subtitle="Portfolio performance across all connected channels"
      />
      <OverviewDashboard />
    </>
  );
}
