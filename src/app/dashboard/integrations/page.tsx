import { Topbar } from "@/components/dashboard/Topbar";
import { IntegrationsClient } from "@/components/dashboard/IntegrationsClient";
import { requireUser } from "@/lib/auth/session";
import { listUserIntegrations } from "@/lib/integrations/repo";
import { listHiggsfieldAccounts } from "@/features/higgsfield/accounts";

export default async function IntegrationsPage() {
  const user = await requireUser();
  const [integrationStates, higgsfieldAccounts] = await Promise.all([
    listUserIntegrations(user.id),
    listHiggsfieldAccounts(user.id),
  ]);

  return (
    <>
      <Topbar
        title="AI Integrations"
        subtitle="API keys, OAuth accounts, status, and usage for every provider"
      />
      <div className="space-y-6 px-4 py-5 sm:px-6 sm:py-6">
        <IntegrationsClient
          integrationStates={integrationStates}
          higgsfieldAccounts={higgsfieldAccounts}
        />
      </div>
    </>
  );
}
