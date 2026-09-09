import Link from "next/link";
import { Plus, Ticket as TicketIcon } from "lucide-react";
import { TicketStatus } from "@prisma/client";
import { listTickets, summariseTickets } from "@/lib/services/tickets";
import { listAgentOptions } from "@/lib/services/agents";
import { getSettings } from "@/lib/services/settings";
import { can } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import { Card, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import {
  ClearFiltersButton,
  DateRangeFilter,
  FilterBar,
  FilterSelect,
  SearchInput,
} from "@/components/shared/filter-bar";
import { TicketTable, type TicketColumn } from "@/components/tickets/ticket-table";
import { TicketFormDialog } from "@/components/tickets/ticket-form-dialog";
import { RecordPaymentDialog } from "@/components/payments/record-payment-dialog";

/**
 * Shared body for /tickets, /tickets/unpaid and /tickets/paid. Each page
 * supplies a fixed status (or none) and its own column set; filtering,
 * sorting and pagination behave identically across all three.
 */
export async function TicketsView({
  user,
  query,
  fixedStatus,
  columns,
  emptyTitle,
  emptyDescription,
  showStatusFilter = true,
}: {
  user: SessionUser;
  query: Record<string, string>;
  fixedStatus?: TicketStatus;
  columns?: TicketColumn[];
  emptyTitle: string;
  emptyDescription: string;
  showStatusFilter?: boolean;
}) {
  const effectiveQuery = fixedStatus ? { ...query, status: fixedStatus } : query;

  const [page, summary, agents, settings] = await Promise.all([
    listTickets(effectiveQuery),
    summariseTickets(effectiveQuery),
    listAgentOptions(),
    getSettings(),
  ]);

  const isFiltered = Boolean(
    query.q || query.agentId || query.from || query.to || (showStatusFilter && query.status),
  );
  const canRecordPayment = can(user.role, "payment:create");

  return (
    <Card>
      <FilterBar>
        <SearchInput
          placeholder="Search PNR, agent or transaction number…"
          className="w-full sm:w-72"
        />
        <FilterSelect
          paramKey="agentId"
          label="Agent"
          allLabel="All agents"
          options={agents.map((agent) => ({
            value: agent.id,
            label: `${agent.name} (${agent.code})`,
          }))}
        />
        {showStatusFilter && (
          <FilterSelect
            paramKey="status"
            label="Status"
            allLabel="All statuses"
            options={[
              { value: "UNPAID", label: "Unpaid" },
              { value: "PAID", label: "Paid" },
            ]}
          />
        )}
        <DateRangeFilter />
        <ClearFiltersButton className="ml-auto" />
      </FilterBar>

      <TicketTable
        tickets={page.items}
        timezone={settings.timezone}
        warnDays={settings.outstandingWarnDays}
        criticalDays={settings.outstandingCriticalDays}
        columns={columns}
        empty={
          <EmptyState
            icon={TicketIcon}
            title={isFiltered ? "No tickets match those filters" : emptyTitle}
            description={
              isFiltered
                ? "Try a different search term, agent, status or date range."
                : emptyDescription
            }
            action={
              !isFiltered &&
              can(user.role, "ticket:create") &&
              agents.length > 0 && (
                <TicketFormDialog
                  agents={agents}
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
        actions={(ticket) =>
          ticket.status === TicketStatus.UNPAID && canRecordPayment ? (
            <RecordPaymentDialog
              ticket={ticket}
              timezone={settings.timezone}
              trigger={
                <Button variant="success" size="sm">
                  Record Payment
                </Button>
              }
            />
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/tickets/${ticket.id}`}>View</Link>
            </Button>
          )
        }
      />

      {page.items.length > 0 && (
        <CardFooter className="flex-col items-stretch gap-0 p-0">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-hairline px-5 py-2.5 text-[12.5px] text-navy-500">
            <span>
              Filtered total:{" "}
              <span className="tabular font-semibold text-navy-800">
                {new Intl.NumberFormat("en-US").format(Number(summary.totalAmount))}{" "}
                {settings.defaultCurrency}
              </span>
            </span>
            <span>
              Paid:{" "}
              <span className="tabular font-semibold text-paid-700">
                {new Intl.NumberFormat("en-US").format(Number(summary.paidAmount))}
              </span>
            </span>
            <span>
              Outstanding:{" "}
              <span className="tabular font-semibold text-unpaid-700">
                {new Intl.NumberFormat("en-US").format(Number(summary.outstandingAmount))}
              </span>
            </span>
          </div>
          <Pagination
            page={page.page}
            pageSize={page.pageSize}
            total={page.total}
            totalPages={page.totalPages}
            label="tickets"
          />
        </CardFooter>
      )}
    </Card>
  );
}
