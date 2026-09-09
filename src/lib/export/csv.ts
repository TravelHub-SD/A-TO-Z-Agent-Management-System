import type { ReportColumn, ReportResult, ReportRow } from "@/lib/services/reports";
import { formatDateTime } from "@/lib/utils/dates";

/**
 * RFC 4180 quoting. A leading `=`, `+`, `-` or `@` is prefixed with a single
 * quote so spreadsheet software does not interpret an exported value as a
 * formula (CSV injection).
 */
function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

function renderCell(
  row: ReportRow,
  column: ReportColumn,
  timezone: string,
): string | number | null {
  const value = row[column.key];
  if (value === null || value === undefined || value === "") return "";
  if (column.type === "date") return formatDateTime(String(value), timezone);
  return value;
}

export function reportToCsv(report: ReportResult, timezone: string): string {
  const lines: string[] = [];

  lines.push(escapeCell(report.title));
  lines.push(escapeCell(report.subtitle));
  if (report.period.from || report.period.to) {
    lines.push(
      escapeCell(
        `Period: ${report.period.from ?? "beginning"} to ${report.period.to ?? "today"}`,
      ),
    );
  }
  lines.push(escapeCell(`Generated: ${formatDateTime(report.generatedAt, timezone)}`));
  lines.push("");

  for (const item of report.summary) {
    lines.push([escapeCell(item.label), escapeCell(item.value)].join(","));
  }
  lines.push("");

  lines.push(report.columns.map((c) => escapeCell(c.label)).join(","));
  for (const row of report.rows) {
    lines.push(
      report.columns
        .map((column) => escapeCell(renderCell(row, column, timezone)))
        .join(","),
    );
  }

  // BOM so Excel opens UTF-8 exports with the correct encoding.
  return `﻿${lines.join("\r\n")}`;
}

export function rowsToCsv(
  columns: Array<{ key: string; label: string }>,
  rows: Array<Record<string, unknown>>,
): string {
  const lines = [columns.map((c) => escapeCell(c.label)).join(",")];
  for (const row of rows) {
    lines.push(
      columns.map((c) => escapeCell(row[c.key] as string | number | null)).join(","),
    );
  }
  return `﻿${lines.join("\r\n")}`;
}
