import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guard";
import { getAgentStatement } from "@/lib/services/statements";
import { getSettings } from "@/lib/services/settings";
import { AppError } from "@/lib/utils/errors";
import { normaliseSearchParams } from "@/lib/utils/request";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TFoot, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { DateRangeFilter, ClearFiltersButton, FilterBar } from "@/components/shared/filter-bar";
import { StatementExport } from "@/components/agents/statement-export";
import { formatMoney, formatNumber } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const statement = await getAgentStatement(id);
    return { title: `${statement.agent.name} — Statement` };
  } catch {
    return { title: "Statement" };
  }
}

export default async function AgentStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  await requirePageUser(`/agents/${id}/statement`);
  const query = normaliseSearchParams(await searchParams);

  let statement;
  try {
    statement = await getAgentStatement(id, { from: query.from, to: query.to });
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }

  const settings = await getSettings();
  const { agent, currency, summary } = statement;

  return (
    <>
      <PageHeader
        title="Account Statement"
        description={`${agent.name} · ${agent.code}`}
        breadcrumbs={[
          { label: "Agents", href: "/agents" },
          { label: agent.name, href: `/agents/${agent.id}` },
          { label: "Statement" },
        ]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/agents/${agent.id}`}>
                <ArrowLeft /> Back to agent
              </Link>
            </Button>
            <StatementExport statement={statement} timezone={settings.timezone} />
          </>
        }
        className="no-print"
      />

      <Card className="print-full">
        {/* Statement masthead — also what a printed sheet leads with. */}
        <div className="border-b border-hairline px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-navy-400">
                {settings.agencyName}
              </p>
              <h2 className="mt-1 text-xl font-semibold uppercase tracking-tight text-navy-900">
                {agent.name}
              </h2>
              <p className="mt-0.5 text-[13px] text-navy-500">
                Account statement · {agent.code}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">
                Period
              </p>
              <p className="mt-1 text-[13.5px] font-medium text-navy-800">
                {statement.from ? formatDate(statement.from, settings.timezone) : "Beginning"}
                {"  →  "}
                {statement.to ? formatDate(statement.to, settings.timezone) : "Today"}
              </p>
              <p className="mt-0.5 text-[12px] text-navy-400">Currency: {currency}</p>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-hairline pt-4 sm:grid-cols-4">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">
                Total Tickets
              </dt>
              <dd className="tabular mt-1 text-lg font-semibold text-navy-900">
                {formatNumber(summary.ticketCount)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">
                Total Amount
              </dt>
              <dd className="mt-1">
                <Money amount={summary.totalAmount} currency={currency} size="lg" />
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">
                Total Paid
              </dt>
              <dd className="mt-1">
                <Money amount={summary.totalPaid} currency={currency} tone="paid" size="lg" />
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">
                Outstanding
              </dt>
              <dd className="mt-1">
                <Money
                  amount={statement.closingBalance}
                  currency={currency}
                  tone={Number(statement.closingBalance) > 0 ? "unpaid" : "paid"}
                  size="lg"
                />
              </dd>
            </div>
          </dl>
        </div>

        <FilterBar className="no-print">
          <span className="text-[12.5px] font-medium text-navy-600">Statement period</span>
          <DateRangeFilter />
          <ClearFiltersButton className="ml-auto" />
        </FilterBar>

        {statement.lines.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No activity in this period"
            description="There are no tickets or payments for this agent within the selected dates."
          />
        ) : (
          <TableWrap>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Date</TH>
                  <TH>Reference / PNR</TH>
                  <TH>Description</TH>
                  <TH align="right">Debit</TH>
                  <TH align="right">Credit</TH>
                  <TH align="right">Balance</TH>
                </TR>
              </THead>
              <TBody>
                {statement.from && Number(statement.openingBalance) !== 0 && (
                  <TR className="bg-navy-50/50 hover:bg-navy-50/50">
                    <TD className="text-navy-500">
                      {formatDate(statement.from, settings.timezone)}
                    </TD>
                    <TD className="text-navy-400">—</TD>
                    <TD className="font-medium text-navy-600">Balance brought forward</TD>
                    <TD align="right" className="text-navy-300">—</TD>
                    <TD align="right" className="text-navy-300">—</TD>
                    <TD align="right">
                      <Money
                        amount={statement.openingBalance}
                        currency={currency}
                        tone="muted"
                        withCurrency={false}
                      />
                    </TD>
                  </TR>
                )}

                {statement.lines.map((line, index) => (
                  <TR key={`${line.type}-${line.paymentId ?? line.ticketId}-${index}`}>
                    <TD className="whitespace-nowrap text-navy-600">
                      {formatDate(line.date, settings.timezone)}
                    </TD>
                    <TD>
                      <Link
                        href={
                          line.paymentId
                            ? `/payments/${line.paymentId}`
                            : `/tickets/${line.ticketId}`
                        }
                        className="font-mono text-[13px] font-medium text-navy-800 transition-colors hover:text-brand-600"
                      >
                        {line.reference}
                      </Link>
                    </TD>
                    <TD className="text-navy-600">{line.description}</TD>
                    <TD align="right">
                      {line.debit ? (
                        <Money
                          amount={line.debit}
                          currency={currency}
                          tone="unpaid"
                          withCurrency={false}
                        />
                      ) : (
                        <span className="text-navy-300">—</span>
                      )}
                    </TD>
                    <TD align="right">
                      {line.credit ? (
                        <Money
                          amount={line.credit}
                          currency={currency}
                          tone="paid"
                          withCurrency={false}
                        />
                      ) : (
                        <span className="text-navy-300">—</span>
                      )}
                    </TD>
                    <TD align="right">
                      <Money
                        amount={line.balance}
                        currency={currency}
                        tone={Number(line.balance) > 0 ? "unpaid" : "neutral"}
                        withCurrency={false}
                      />
                    </TD>
                  </TR>
                ))}
              </TBody>
              <TFoot>
                <TR className="hover:bg-transparent">
                  <TD colSpan={3} className="font-semibold text-navy-800">
                    Closing balance
                  </TD>
                  <TD align="right">
                    <Money
                      amount={summary.totalAmount}
                      currency={currency}
                      tone="unpaid"
                      withCurrency={false}
                    />
                  </TD>
                  <TD align="right">
                    <Money
                      amount={summary.totalPaid}
                      currency={currency}
                      tone="paid"
                      withCurrency={false}
                    />
                  </TD>
                  <TD align="right">
                    <Money
                      amount={statement.closingBalance}
                      currency={currency}
                      tone={Number(statement.closingBalance) > 0 ? "unpaid" : "paid"}
                    />
                  </TD>
                </TR>
              </TFoot>
            </Table>
          </TableWrap>
        )}

        <CardContent className="border-t border-hairline text-[12px] leading-relaxed text-navy-400">
          Tickets are debits, payments are credits, and the balance column is the
          running amount owed to {settings.agencyName} after each entry. Closing
          balance as at{" "}
          {statement.to
            ? formatDate(statement.to, settings.timezone)
            : formatDate(new Date(), settings.timezone)}
          : {formatMoney(statement.closingBalance, currency)}.
        </CardContent>
      </Card>
    </>
  );
}
