import type { Metadata } from "next";
import { TicketStatus } from "@prisma/client";
import { AlertTriangle, CircleDollarSign, Clock } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guard";
import { listTickets, summariseTickets } from "@/lib/services/tickets";
import { getSettings } from "@/lib/services/settings";
import { normaliseSearchParams } from "@/lib/utils/request";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Alert } from "@/components/ui/alert";
import { TicketsView } from "@/components/tickets/tickets-view";
import { formatMoney, formatNumber } from "@/lib/utils/currency";

export const metadata: Metadata = { title: "Unpaid tickets" };
export const dynamic = "force-dynamic";

export default async function UnpaidTicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser("/tickets/unpaid");
  const query = normaliseSearchParams(await searchParams);

  const [summary, settings, oldest] = await Promise.all([
    summariseTickets({ ...query, status: TicketStatus.UNPAID }),
    getSettings(),
    // Oldest unpaid ticket, used for the ageing callout.
    listTickets({
      ...query,
      status: TicketStatus.UNPAID,
      page: 1,
      pageSize: 1,
      sort: "createdAt",
      dir: "asc",
    }),
  ]);

  const oldestTicket = oldest.items[0];
  const overdue =
    oldestTicket && oldestTicket.daysOutstanding >= settings.outstandingCriticalDays;

  return (
    <>
      <PageHeader
        title="Unpaid Tickets"
        description="Everything currently owed to A TO Z, oldest first."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total Outstanding"
          value={summary.outstandingAmount}
          currency={settings.defaultCurrency}
          tone="unpaid"
          icon={CircleDollarSign}
        />
        <StatCard
          label="Unpaid Tickets"
          value={formatNumber(summary.unpaidCount)}
          tone="unpaid"
          icon={Clock}
          caption="Across the current filters"
        />
        <StatCard
          label="Oldest Outstanding"
          value={
            oldestTicket ? `${formatNumber(oldestTicket.daysOutstanding)} days` : "—"
          }
          tone={overdue ? "unpaid" : "neutral"}
          icon={AlertTriangle}
          caption={
            oldestTicket
              ? `${oldestTicket.pnr} · ${oldestTicket.agent.name}`
              : "Nothing outstanding"
          }
          href={oldestTicket ? `/tickets/${oldestTicket.id}` : undefined}
        />
      </div>

      {overdue && oldestTicket && (
        <Alert tone="warning" className="mb-5" title="Ageing balance">
          {oldestTicket.agent.name} has had{" "}
          {formatMoney(oldestTicket.amount, oldestTicket.currency)} outstanding on{" "}
          {oldestTicket.pnr} for {oldestTicket.daysOutstanding} days — past the{" "}
          {settings.outstandingCriticalDays}-day threshold set in Settings.
        </Alert>
      )}

      <TicketsView
        user={user}
        query={{ sort: "createdAt", dir: "asc", ...query }}
        fixedStatus={TicketStatus.UNPAID}
        showStatusFilter={false}
        columns={["pnr", "agent", "amount", "createdAt", "daysOutstanding"]}
        emptyTitle="Nothing outstanding"
        emptyDescription="Every ticket has been paid. New unpaid tickets will appear here."
      />
    </>
  );
}
