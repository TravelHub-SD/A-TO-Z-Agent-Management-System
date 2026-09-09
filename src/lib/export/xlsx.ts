import "server-only";
import ExcelJS from "exceljs";
import type { ReportResult } from "@/lib/services/reports";
import { formatDateTime } from "@/lib/utils/dates";

const NAVY = "FF0F2942";
const LIGHT = "FFF1F5F9";

/**
 * Renders a report as a formatted .xlsx workbook: a title block, the summary
 * figures, then the data table with number formats applied so money columns
 * stay numeric (and therefore sortable and summable) in Excel.
 */
export async function reportToXlsx(
  report: ReportResult,
  timezone: string,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "A TO Z — Agent Management System";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(report.title.slice(0, 31), {
    views: [{ state: "frozen", ySplit: 0 }],
  });

  const columnCount = Math.max(report.columns.length, 2);

  const titleRow = sheet.addRow([report.title]);
  titleRow.font = { size: 16, bold: true, color: { argb: NAVY } };
  sheet.mergeCells(titleRow.number, 1, titleRow.number, columnCount);

  const subtitleRow = sheet.addRow([report.subtitle]);
  subtitleRow.font = { size: 11, color: { argb: "FF64748B" } };
  sheet.mergeCells(subtitleRow.number, 1, subtitleRow.number, columnCount);

  if (report.period.from || report.period.to) {
    const periodRow = sheet.addRow([
      `Period: ${report.period.from ?? "beginning"} → ${report.period.to ?? "today"}`,
    ]);
    periodRow.font = { size: 10, color: { argb: "FF64748B" } };
    sheet.mergeCells(periodRow.number, 1, periodRow.number, columnCount);
  }

  const generatedRow = sheet.addRow([
    `Generated ${formatDateTime(report.generatedAt, timezone)}`,
  ]);
  generatedRow.font = { size: 10, color: { argb: "FF64748B" } };
  sheet.mergeCells(generatedRow.number, 1, generatedRow.number, columnCount);

  sheet.addRow([]);

  for (const item of report.summary) {
    const row = sheet.addRow([item.label, item.value]);
    row.getCell(1).font = { bold: true };
    const numeric = Number(item.value);
    if (Number.isFinite(numeric) && item.value.includes(".")) {
      row.getCell(2).value = numeric;
      row.getCell(2).numFmt = `#,##0.00 "${report.currency}"`;
    }
  }

  sheet.addRow([]);

  const headerRow = sheet.addRow(report.columns.map((c) => c.label));
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle" };
  });
  headerRow.height = 20;
  const headerRowNumber = headerRow.number;

  for (const [index, row] of report.rows.entries()) {
    const values = report.columns.map((column) => {
      const value = row[column.key];
      if (value === null || value === undefined || value === "") return "";
      if (column.type === "money") return Number(value);
      if (column.type === "number") return Number(value);
      if (column.type === "date") return formatDateTime(String(value), timezone);
      return String(value);
    });

    const sheetRow = sheet.addRow(values);
    if (index % 2 === 1) {
      sheetRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT } };
      });
    }

    report.columns.forEach((column, columnIndex) => {
      const cell = sheetRow.getCell(columnIndex + 1);
      if (column.type === "money") {
        cell.numFmt = `#,##0.00 "${report.currency}"`;
        cell.alignment = { horizontal: "right" };
      } else if (column.type === "number") {
        cell.numFmt = "#,##0";
        cell.alignment = { horizontal: "right" };
      }
    });
  }

  sheet.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: { row: headerRowNumber + report.rows.length, column: report.columns.length },
  };

  report.columns.forEach((column, index) => {
    const longest = report.rows.reduce((max, row) => {
      const text = String(row[column.key] ?? "");
      return Math.max(max, text.length);
    }, column.label.length);
    sheet.getColumn(index + 1).width = Math.min(40, Math.max(12, longest + 4));
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
