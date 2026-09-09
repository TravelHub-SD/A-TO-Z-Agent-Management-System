"use client";

import { ExportButtons, type PdfTable } from "@/components/shared/export-buttons";
import type { ReportResult } from "@/lib/services/reports";
import { formatMoney } from "@/lib/utils/currency";
import { formatDate, formatDateTime, toISODate } from "@/lib/utils/dates";

/**
 * Exports whatever report is currently on screen. The PDF is built from the
 * same `ReportResult` the table renders, so the three formats always agree.
 */
export function ReportExport({
  report,
  timezone,
  exportHref,
}: {
  report: ReportResult;
  timezone: string;
  exportHref: string;
}) {
  const buildPdf = (): PdfTable => ({
    title: report.title,
    subtitle: report.subtitle,
    meta: [
      `Period: ${report.period.from ?? "Beginning"} → ${report.period.to ?? "Today"}`,
      report.summary
        .map((item) => {
          const numeric = Number(item.value);
          const value =
            Number.isFinite(numeric) && item.value.includes(".")
              ? formatMoney(item.value, report.currency)
              : item.value;
          return `${item.label}: ${value}`;
        })
        .join("   ·   "),
      `Generated ${formatDateTime(report.generatedAt, timezone)}`,
    ],
    columns: report.columns.map((column) => column.label),
    rows: report.rows.map((row) =>
      report.columns.map((column) => {
        const value = row[column.key];
        if (value === null || value === undefined || value === "") return "—";
        if (column.type === "money") {
          return formatMoney(value as string, report.currency, { withCurrency: false });
        }
        if (column.type === "date") return formatDate(String(value), timezone);
        return String(value);
      }),
    ),
    filename: `${report.type}-report-${toISODate(new Date(), timezone)}`,
  });

  return <ExportButtons exportHref={exportHref} pdf={buildPdf} />;
}
