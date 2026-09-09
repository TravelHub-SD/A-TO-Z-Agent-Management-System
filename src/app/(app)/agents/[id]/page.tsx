import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CircleDollarSign,
  FileText,
  Mail,
  Phone,
  Plus,
  Receipt,
  StickyNote,
  Ticket as TicketIcon,
} from "lucide-react";
import { requirePageUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { getAgentWithTotals } from "@/lib/services/agents";
import { listTickets } from "@/lib/services/tickets";
import { getSettings } from "@/lib/services/settings";
import { AppError } from "@/lib/utils/errors";
import { normaliseSearchParams } from "@/lib/utils/request";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ActiveBadge } from "@/components/shared/status-badge";
import { Pagination } from "@/components/shared/pagination";
import {
  ClearFiltersButton,
  DateRangeFilter,
  FilterBar,
  FilterSelect,
  SearchInput,
} from "@/components/shared/filter-bar";
import { TicketTable } from "@/components/tickets/ticket-table";
import { TicketFormDialog } from "@/components/tickets/ticket-form-dialog";
import { AgentActions } from "@/components/agents/agent-actions";
import { formatNumber } from "@/lib/utils/currency";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const agent = await getAgentWithTotals(id);
    return { title: agent.name };
  } catch {
    return { title: "Agent" };
  }
}

export default async function AgentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const user = await requirePageUser(`/agents/${id}`);
  const query = normaliseSearchParams(await searchParams);

  let agent;
  try {
    agent = await getAgentWithTotals(id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }

  const [tickets, settings] = await Promise.all([
    listTickets({ ...query, agentId: id }),
    getSettings(),
  ]);

  const isFiltered = Boolean(query.q || query.status || query.from || query.to);

  return (
    <>
      <PageHeader
        title={agent.name}
        description={agent.code}
        breadcrumbs={[{ label: "Agents", href: "/agents" }, { label: agent.name }]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/agents/${agent.id}/statement`}>
                <FileText /> View Statement
              </Link>
            </Button>
            {can(user.role, "ticket:create") && agent.isActive && (
              <TicketFormDialog
                agents={[{ id: agent.id, name: agent.name, code: agent.code }]}
                defaultAgentId={agent.id}
                lockAgent
                defaultCurrency={settings.defaultCurrency}
                trigger={
                  <Button variant="brand">
                    <Plus /> Add Ticket
                  </Button>
                }
              />
            )}
            <AgentActions
              agent={agent}
              canEdit={can(user.role, "agent:update")}
              canToggleActive={can(user.role, "agent:toggle-active")}
            />
          </>
        }
      />

      {/* Contact strip */}
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[var(--radius-card)] border border-hairline bg-surface px-5 py-3 shadow-[var(--shadow-card)]">
        <ActiveBadge isActive={agent.isActive} />
        {agent.phone && (
          <span className="flex items-center gap-1.5 text-[13px] text-navy-600">
            <Phone className="size-3.5 text-navy-400" aria-hidden />
            {agent.phone}
          </span>
        )}
        {agent.email && (
          <a
            href={`mailto:${agent.email}`}
            className="flex items-center gap-1.5 text-[13px] text-navy-600 transition-colors hover:text-brand-600"
          >
            <Mail className="size-3.5 text-navy-400" aria-hidden />
            {agent.email}
          </a>
        )}
        {agent.notes && (
          <span className="flex min-w-0 items-start gap-1.5 text-[13px] text-navy-500">
            <StickyNote className="mt-0.5 size-3.5 shrink-0 text-navy-400" aria-hidden />
            <span className="min-w-0 flex-1">{agent.notes}</span>
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Tickets"
          value={formatNumber(agent.ticketCount)}
          icon={TicketIcon}
          caption={`${formatNumber(agent.paidCount)} paid · ${formatNumber(agent.unpaidCount)} unpaid`}
        />
        <StatCard
          label="Total Amount"
          value={agent.totalAmount}
          currency={agent.currency}
          icon={Receipt}
        />
        <StatCard
          label="Paid"
          value={agent.paidAmount}
          currency={agent.currency}
          tone="paid"
          icon={BadgeCheck}
        />
        <StatCard
          label="Outstanding"
          value={agent.outstandingAmount}
          currency={agent.currency}
          tone="unpaid"
          icon={CircleDollarSign}
          caption={
            Number(agent.outstandingAmount) > 0
              ? `${formatNumber(agent.unpaidCount)} unpaid ticket${agent.unpaidCount === 1 ? "" : "s"}`
              : "Fully settled"
          }
        />
      </div>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Tickets</CardTitle>
        </CardHeader>

        <FilterBar>
          <SearchInput placeholder="Search PNR…" className="w-full sm:w-56" />
          <FilterSelect
            paramKey="status"
            label="Status"
            allLabel="All statuses"
            options={[
              { value: "UNPAID", label: "Unpaid" },
              { value: "PAID", label: "Paid" },
            ]}
          />
          <DateRangeFilter />
          <ClearFiltersButton className="ml-auto" />
        </FilterBar>

        <TicketTable
          tickets={tickets.items}
          timezone={settings.timezone}
          warnDays={settings.outstandingWarnDays}
          criticalDays={settings.outstandingCriticalDays}
          columns={["pnr", "amount", "status", "transactionNumber", "createdAt", "paidAt"]}
          empty={
            <EmptyState
              icon={TicketIcon}
              title={isFiltered ? "No tickets match those filters" : "No tickets yet"}
              description={
                isFiltered
                  ? "Try a different search term, status or date range."
                  : `Add the first ticket for ${agent.name} to start tracking their balance.`
              }
              action={
                !isFiltered &&
                can(user.role, "ticket:create") &&
                agent.isActive && (
                  <TicketFormDialog
                    agents={[{ id: agent.id, name: agent.name, code: agent.code }]}
                    defaultAgentId={agent.id}
                    lockAgent
                    defaultCurrency={settings.defaultCurrency}
                    trigger={
                      <Button variant="brand" size="sm">
                        <Plus /> Add Ticket
                      </Button>
                    }
                  />
                )
              }
            />
          }
          actions={(ticket) => (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/tickets/${ticket.id}`}>View</Link>
            </Button>
          )}
        />

        {tickets.items.length > 0 && (
          <CardFooter className="p-0">
            <Pagination
              page={tickets.page}
              pageSize={tickets.pageSize}
              total={tickets.total}
              totalPages={tickets.totalPages}
              label="tickets"
            />
          </CardFooter>
        )}
      </Card>
    </>
  );
}
