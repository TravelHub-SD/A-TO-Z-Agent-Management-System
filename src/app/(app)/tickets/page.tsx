import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { listAgentOptions } from "@/lib/services/agents";
import { getSettings } from "@/lib/services/settings";
import { normaliseSearchParams } from "@/lib/utils/request";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { TicketsView } from "@/components/tickets/tickets-view";
import { TicketFormDialog } from "@/components/tickets/ticket-form-dialog";

export const metadata: Metadata = { title: "All tickets" };
export const dynamic = "force-dynamic";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser("/tickets");
  const query = normaliseSearchParams(await searchParams);
  const [agents, settings] = await Promise.all([listAgentOptions(), getSettings()]);

  return (
    <>
      <PageHeader
        title="All Tickets"
        description="Every ticket issued on behalf of an agent, paid and unpaid."
        actions={
          can(user.role, "ticket:create") &&
          agents.length > 0 && (
            <TicketFormDialog
              agents={agents}
              defaultCurrency={settings.defaultCurrency}
              trigger={
                <Button variant="brand">
                  <Plus /> Add Ticket
                </Button>
              }
            />
          )
        }
      />

      <TicketsView
        user={user}
        query={query}
        emptyTitle="No tickets yet"
        emptyDescription="Create the first ticket to start tracking what agents owe A TO Z."
      />
    </>
  );
}
