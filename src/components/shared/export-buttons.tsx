"use client";

import * as React from "react";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export type PdfTable = {
  title: string;
  subtitle?: string;
  meta?: string[];
  columns: string[];
  rows: Array<Array<string | number>>;
  filename: string;
};

/**
 * Export menu. CSV and Excel are produced by the server (one source of truth
 * for the report shape); PDF is rendered in the browser so the heavy PDF
 * library is never part of the server bundle.
 */
export function ExportButtons({
  exportHref,
  pdf,
  label = "Export",
}: {
  exportHref?: string;
  pdf?: () => PdfTable;
  label?: string;
}) {
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  const download = (format: "csv" | "xlsx") => {
    if (!exportHref) return;
    const separator = exportHref.includes("?") ? "&" : "?";
    window.location.href = `${exportHref}${separator}format=${format}`;
  };

  const exportPdf = async () => {
    if (!pdf || busy) return;
    setBusy(true);
    try {
      const table = pdf();
      const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const doc = new JsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const marginX = 40;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(15, 31, 48);
      doc.text(table.title, marginX, 44);

      let cursorY = 62;
      if (table.subtitle) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(74, 103, 133);
        doc.text(table.subtitle, marginX, cursorY);
        cursorY += 15;
      }
      for (const line of table.meta ?? []) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(107, 135, 166);
        doc.text(line, marginX, cursorY);
        cursorY += 12;
      }

      autoTable(doc, {
        head: [table.columns],
        body: table.rows.map((row) => row.map((cell) => String(cell ?? ""))),
        startY: cursorY + 6,
        margin: { left: marginX, right: marginX },
        styles: { fontSize: 8.5, cellPadding: 5, lineColor: [227, 233, 240], lineWidth: 0.5 },
        headStyles: { fillColor: [15, 31, 48], textColor: 255, fontStyle: "bold", fontSize: 8.5 },
        alternateRowStyles: { fillColor: [244, 247, 251] },
        theme: "grid",
      });

      doc.save(`${table.filename}.pdf`);
    } catch (error) {
      console.error("[export] PDF generation failed:", error);
      toast.error("Could not generate the PDF", "Try the Excel or CSV export instead.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" loading={busy}>
          <Download /> {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Download as</DropdownMenuLabel>
        {pdf && (
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              void exportPdf();
            }}
          >
            <FileText /> PDF
          </DropdownMenuItem>
        )}
        {exportHref && (
          <>
            <DropdownMenuItem onSelect={() => download("xlsx")}>
              <FileSpreadsheet /> Excel (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => download("csv")}>
              <FileText /> CSV
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => window.print()}>
          <Printer /> Print
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
