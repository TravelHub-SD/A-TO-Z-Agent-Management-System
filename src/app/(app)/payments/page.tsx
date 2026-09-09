import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Wallet } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guard";
import { listPayments } from "@/lib/services/payments";
import { listAgentOptions } from "@/lib/services/agents";
import { getSettings } from "@/lib/services/settings";
import { normaliseSearchParams } from "@/lib/utils/request";
import { Card, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { Pagination } from "@/components/shared/pagination";
import {
  ClearFiltersButton,
  DateRangeFilter,
  FilterBar,
  FilterSelect,
  SearchInput,
} from "@/components/shared/filter-bar";
import { ExportButtons } from "@/components/shared/export-buttons";
import { AmountFilter } from "@/components/payments/amount-filter";
import { formatNumber } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePageUser("/payments");
  const query = normaliseSearchParams(await searchParams);

  const [page, agents, settings] = await Promise.all([
    listPayments(query),
    listAgentOptions(true),
    getSettings(),
  ]);

  const isFiltered = Boolean(
    query.q || query.agentId || query.from || query.to || query.minAmount || query.maxAmount,
  );

  const exportHref = `/api/reports/export?type=payment${
    query.agentId ? `&agentId=${query.agentId}` : ""
  }${query.from ? `&from=${query.from}` : ""}${query.to ? `&to=${query.to}` : ""}`;

  return (
    <>
      <PageHeader
        title="Payments"
        description="Every payment received from an agent, searchable by transaction number."
        actions={<ExportButtons exportHref={exportHref} label="Export payments" />}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Total Collected"
          value={page.totalAmount}
          currency={settings.defaultCurrency}
          tone="paid"
          icon={BadgeCheck}
          caption={isFiltered ? "Across the current filters" : "All time"}
        />
        <StatCard
          label="Payments Recorded"
          value={formatNumber(page.total)}
          icon={Wallet}
          tone="paid"
          caption={isFiltered ? "Matching the current filters" : "All time"}
        />
      </div>

      <Card>
        <FilterBar>
          <SearchInput
            placeholder="Search transaction number, PNR or agent…"
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
          <DateRangeFilter />
          <div className="flex items-center gap-1.5">
            <AmountFilter paramKey="minAmount" placeholder="Min amount" />
            <span className="text-navy-400" aria-hidden>–</span>
            <AmountFilter paramKey="maxAmount" placeholder="Max amount" />
          </div>
          <ClearFiltersButton className="ml-auto" />
        </FilterBar>

        {page.items.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={isFiltered ? "No payments match those filters" : "No payments found"}
            description={
              isFiltered
                ? "Try a different transaction number, agent, date range or amount."
                : "Payments appear here as soon as they are recorded against a ticket."
            }
            action={
              !isFiltered && (
                <Button asChild variant="brand" size="sm">
                  <Link href="/tickets/unpaid">View unpaid tickets</Link>
                </Button>
              )
            }
          />
        ) : (
          <>
            <TableWrap>
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Transaction No.</TH>
                    <TH>PNR</TH>
                    <TH>Agent</TH>
                    <TH align="right">Amount</TH>
                    <TH>Paid by</TH>
                    <TH>Paid at</TH>
                    <TH align="right">Actions</TH>
                  </TR>
                </THead>
                <TBody>
                  {page.items.map((payment) => (
                    <TR key={payment.id}>
                      <TD>
                        <Link
                          href={`/payments/${payment.id}`}
                          className="tabular font-mono text-[13.5px] font-semibold tracking-[0.15em] text-paid-700 transition-colors hover:text-paid-800"
                        >
                          {payment.transactionNumber}
                        </Link>
                      </TD>
                      <TD>
                        <Link
                          href={`/tickets/${payment.ticket.id}`}
                          className="font-mono text-[13px] text-navy-800 transition-colors hover:text-brand-600"
                        >
                          {payment.ticket.pnr}
                        </Link>
                      </TD>
                      <TD>
                        <Link
                          href={`/agents/${payment.ticket.agent.id}`}
                          className="transition-colors hover:text-brand-600"
                        >
                          <span className="block max-w-[12rem] truncate font-medium">
                            {payment.ticket.agent.name}
                          </span>
                          <span className="block text-[11.5px] text-navy-400">
                            {payment.ticket.agent.code}
                          </span>
                        </Link>
                      </TD>
                      <TD align="right">
                        <Money amount={payment.amount} currency={payment.currency} tone="paid" />
                      </TD>
                      <TD className="text-navy-600">{payment.paidBy?.name ?? "—"}</TD>
                      <TD className="whitespace-nowrap text-navy-600">
                        {formatDateTime(payment.paidAt, settings.timezone)}
                      </TD>
                      <TD align="right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/payments/${payment.id}`}>View</Link>
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>

            <CardFooter className="p-0">
              <Pagination
                page={page.page}
                pageSize={page.pageSize}
                total={page.total}
                totalPages={page.totalPages}
                label="payments"
              />
            </CardFooter>
          </>
        )}
      </Card>
    </>
  );
}
