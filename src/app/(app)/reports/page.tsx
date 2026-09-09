import type { Metadata } from "next";
import { Suspense } from "react";
import { BarChart3 } from "lucide-react";
import { TicketStatus } from "@prisma/client";
import { requirePageUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { buildReport } from "@/lib/services/reports";
import { listAgentOptions } from "@/lib/services/agents";
import { getSettings } from "@/lib/services/settings";
import { forbidden } from "@/lib/utils/errors";
import { normaliseSearchParams, buildQueryString } from "@/lib/utils/request";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Money } from "@/components/shared/money";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { ReportControls, ReportTypeTabs } from "@/components/reports/report-filters";
import { ReportExport } from "@/components/reports/report-export";
import { formatDate, formatDateTime } from "@/lib/utils/dates";
import { formatNumber } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser("/reports");
  if (!can(user.role, "report:view")) throw forbidden();

  const query = normaliseSearchParams(await searchParams);
  const type = (query.type ?? "outstanding") as
    | "agent"
    | "payment"
    | "outstanding"
    | "ticket";

  const agents = await listAgentOptions(true);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Build a report, review it on screen, then export to PDF, Excel or CSV."
      />

      <ReportTypeTabs active={type} />

      <div className="mt-5">
        <Suspense
          key={JSON.stringify(query)}
          fallback={
            <Card>
              <TableSkeleton rows={8} columns={6} />
            </Card>
          }
        >
          <ReportPanel query={{ ...query, type }} agents={agents} />
        </Suspense>
      </div>
    </>
  );
}

async function ReportPanel({
  query,
  agents,
}: {
  query: Record<string, string>;
  agents: Array<{ id: string; name: string; code: string }>;
}) {
  const [report, settings] = await Promise.all([buildReport(query), getSettings()]);

  const exportHref = `/api/reports/export${buildQueryString({
    type: report.type,
    agentId: query.agentId,
    status: query.status,
    from: query.from,
    to: query.to,
  })}`;

  const showStatus = report.type === "ticket" || report.type === "agent";

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{report.title}</CardTitle>
          <CardDescription>
            {report.subtitle} · {report.period.from ?? "Beginning"} →{" "}
            {report.period.to ?? "Today"}
          </CardDescription>
        </div>
        <ReportExport report={report} timezone={settings.timezone} exportHref={exportHref} />
      </CardHeader>

      <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-5 py-3">
        <ReportControls agents={agents} showStatus={showStatus} />
      </div>

      {/* Headline figures for the report as generated. */}
      <dl className="grid gap-px border-b border-hairline bg-hairline sm:grid-cols-2 xl:grid-cols-4">
        {report.summary.map((item) => {
          const numeric = Number(item.value);
          const isMoney = Number.isFinite(numeric) && item.value.includes(".");
          return (
            <div key={item.label} className="bg-surface px-5 py-3.5">
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">
                {item.label}
              </dt>
              <dd className="mt-1">
                {isMoney ? (
                  <Money
                    amount={item.value}
                    currency={report.currency}
                    tone={item.tone ?? "neutral"}
                    size="lg"
                  />
                ) : (
                  <span className="tabular text-lg font-semibold text-navy-900">
                    {formatNumber(Number(item.value))}
                  </span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>

      {report.rows.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Nothing to report"
          description="No records match the selected agent, status or date range."
        />
      ) : (
        <>
          <TableWrap>
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  {report.columns.map((column) => (
                    <TH key={column.key} align={column.align === "right" ? "right" : "left"}>
                      {column.label}
                    </TH>
                  ))}
                </TR>
              </THead>
              <TBody>
                {report.rows.map((row, index) => (
                  <TR key={index}>
                    {report.columns.map((column) => {
                      const value = row[column.key];

                      if (value === null || value === undefined || value === "") {
                        return (
                          <TD key={column.key} align={column.align === "right" ? "right" : "left"}>
                            <span className="text-navy-300">—</span>
                          </TD>
                        );
                      }

                      if (column.type === "money") {
                        const paidRow = row.status === TicketStatus.PAID;
                        const outstandingColumn = column.key === "outstanding";
                        const paidColumn = column.key === "paid";
                        return (
                          <TD key={column.key} align="right">
                            <Money
                              amount={String(value)}
                              currency={report.currency}
                              tone={
                                outstandingColumn
                                  ? Number(value) > 0
                                    ? "unpaid"
                                    : "muted"
                                  : paidColumn
                                    ? Number(value) > 0
                                      ? "paid"
                                      : "muted"
                                    : report.type === "payment"
                                      ? "paid"
                                      : report.type === "outstanding"
                                        ? "unpaid"
                                        : paidRow
                                          ? "paid"
                                          : "unpaid"
                              }
                            />
                          </TD>
                        );
                      }

                      if (column.type === "date") {
                        return (
                          <TD key={column.key} className="whitespace-nowrap text-navy-600">
                            {formatDate(String(value), settings.timezone)}
                          </TD>
                        );
                      }

                      if (column.type === "status") {
                        if (value === TicketStatus.PAID || value === TicketStatus.UNPAID) {
                          return (
                            <TD key={column.key}>
                              <StatusBadge status={value as TicketStatus} size="sm" />
                            </TD>
                          );
                        }
                        return (
                          <TD key={column.key}>
                            <Badge variant={value === "Active" ? "paid" : "neutral"} size="sm">
                              {String(value)}
                            </Badge>
                          </TD>
                        );
                      }

                      if (column.type === "number") {
                        const days = column.key === "days";
                        const overdue =
                          days && Number(value) >= settings.outstandingCriticalDays;
                        return (
                          <TD key={column.key} align="right">
                            <span
                              className={cn(
                                "tabular",
                                overdue ? "font-semibold text-unpaid-700" : "text-navy-700",
                              )}
                            >
                              {formatNumber(Number(value))}
                            </span>
                          </TD>
                        );
                      }

                      return (
                        <TD
                          key={column.key}
                          className={cn(
                            column.key === "pnr" || column.key === "transactionNumber"
                              ? "font-mono text-[13px]"
                              : undefined,
                          )}
                        >
                          {String(value)}
                        </TD>
                      );
                    })}
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline px-5 py-3 text-[12px] text-navy-500">
            <span>
              {formatNumber(report.rows.length)} row
              {report.rows.length === 1 ? "" : "s"} · currency {report.currency}
            </span>
            <span>Generated {formatDateTime(report.generatedAt, settings.timezone)}</span>
          </div>
        </>
      )}
    </Card>
  );
}
