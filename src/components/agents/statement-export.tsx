"use client";

import { ExportButtons, type PdfTable } from "@/components/shared/export-buttons";
import type { Statement } from "@/lib/services/types";
import { formatMoney } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/dates";

/**
 * Exports the statement exactly as displayed — same lines, same running
 * balance — so a printed or emailed statement always reconciles with the
 * screen.
 */
export function StatementExport({
  statement,
  timezone,
}: {
  statement: Statement;
  timezone: string;
}) {
  const buildPdf = (): PdfTable => ({
    title: `${statement.agent.name.toUpperCase()} — Account Statement`,
    subtitle: `Agent code ${statement.agent.code} · Currency ${statement.currency}`,
    meta: [
      `Period: ${statement.from ?? "Beginning"} → ${statement.to ?? "Today"}`,
      `Opening balance ${formatMoney(statement.openingBalance, statement.currency)} · Closing balance ${formatMoney(statement.closingBalance, statement.currency)}`,
      `Tickets ${statement.summary.ticketCount} · Billed ${formatMoney(statement.summary.totalAmount, statement.currency)} · Paid ${formatMoney(statement.summary.totalPaid, statement.currency)} · Outstanding ${formatMoney(statement.summary.outstanding, statement.currency)}`,
    ],
    columns: ["Date", "Reference / PNR", "Description", "Debit", "Credit", "Balance"],
    rows: statement.lines.map((line) => [
      formatDate(line.date, timezone),
      line.reference,
      line.description,
      line.debit ? formatMoney(line.debit, statement.currency, { withCurrency: false }) : "—",
      line.credit ? formatMoney(line.credit, statement.currency, { withCurrency: false }) : "—",
      formatMoney(line.balance, statement.currency, { withCurrency: false }),
    ]),
    filename: `statement-${statement.agent.code}-${statement.to ?? "current"}`,
  });

  const exportHref = `/api/reports/export?type=agent&agentId=${statement.agent.id}${
    statement.from ? `&from=${statement.from}` : ""
  }${statement.to ? `&to=${statement.to}` : ""}`;

  return <ExportButtons exportHref={exportHref} pdf={buildPdf} label="Export Statement" />;
}
