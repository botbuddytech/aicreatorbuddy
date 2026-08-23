import { Topbar } from "@/components/dashboard/Topbar";
import { ActionButton } from "@/components/ui/ActionButton";
import { BestTimeBoard } from "@/components/dashboard/scheduler/BestTimeBoard";
import { SchedulerStatCard } from "@/components/dashboard/scheduler/SchedulerStatCard";
import { bestTimeStatCards } from "@/lib/dashboardContent";

function StatSub({ cardId, text }: { cardId: string; text?: string }) {
  if (!text) return null;

  if (cardId === "best-day" || cardId === "online-now") {
    return (
      <p className="flex items-center gap-1 text-success">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 15l6-6 6 6" />
        </svg>
        {text}
      </p>
    );
  }

  return <p>{text}</p>;
}

export default function BestTimeToPostPage() {
  return (
    <>
      <Topbar
        title="Best Time To Post"
        subtitle="Best time to post your content by AI Powered"
        actions={
          <ActionButton variant="secondary" type="button">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export
          </ActionButton>
        }
      />
      <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {bestTimeStatCards.map((card) => (
            <SchedulerStatCard
              key={card.id}
              icon={card.icon}
              label={card.label}
              value={card.value}
              badge={card.badge}
              sub={<StatSub cardId={card.id} text={card.sub} />}
            />
          ))}
        </div>
        <BestTimeBoard />
      </div>
    </>
  );
}
