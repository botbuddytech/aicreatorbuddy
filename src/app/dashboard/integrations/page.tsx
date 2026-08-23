import { Topbar } from "@/components/dashboard/Topbar";
import { IntegrationsClient } from "@/components/dashboard/IntegrationsClient";

export default function IntegrationsPage() {
  return (
    <>
      <Topbar
        title="AI Integrations"
        subtitle="API keys, quotas, and usage across YouTube, VidIQ, ChatGPT, ElevenLabs, Seedance, and Remotion"
      />
      <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        <IntegrationsClient />
      </div>
    </>
  );
}
