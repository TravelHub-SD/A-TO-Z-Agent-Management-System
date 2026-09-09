import type { Metadata } from "next";
import { TicketStatus } from "@prisma/client";
import { BadgeCheck } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guard";
import { summariseTickets } from "@/lib/services/tickets";
import { getSettings } from "@/lib/services/settings";
import { normaliseSearchParams } from "@/lib/utils/request";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { TicketsView } from "@/components/tickets/tickets-view";
import { formatNumber } from "@/lib/utils/currency";

export const metadata: Metadata = { title: "Paid tickets" };
export const dynamic = "force-dynamic";

export default async function PaidTicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser("/tickets/paid");
  const query = normaliseSearchParams(await searchParams);

  const [summary, settings] = await Promise.all([
    summariseTickets({ ...query, status: TicketStatus.PAID }),
    getSettings(),
  ]);

  return (
    <>
      <PageHeader
        title="Paid Tickets"
        description="Tickets settled by agents, with the transaction number that confirms each payment."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Total Collected"
          value={summary.paidAmount}
          currency={settings.defaultCurrency}
          tone="paid"
          icon={BadgeCheck}
          caption="Across the current filters"
        />
        <StatCard
          label="Paid Tickets"
          value={formatNumber(summary.paidCount)}
          icon={BadgeCheck}
          tone="paid"
          href="/payments"
          caption="View the payment records"
        />
      </div>

      <TicketsView
        user={user}
        query={query}
        fixedStatus={TicketStatus.PAID}
        showStatusFilter={false}
        columns={["pnr", "agent", "amount", "status", "transactionNumber", "createdAt", "paidAt"]}
        emptyTitle="No paid tickets yet"
        emptyDescription="Once a payment is recorded against a ticket it appears here."
      />
    </>
  );
}
