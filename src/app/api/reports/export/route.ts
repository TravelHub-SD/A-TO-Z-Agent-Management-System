import { NextResponse } from "next/server";
import { buildReport } from "@/lib/services/reports";
import { getSettings } from "@/lib/services/settings";
import { requirePermission } from "@/lib/auth/guard";
import { reportToCsv } from "@/lib/export/csv";
import { reportToXlsx } from "@/lib/export/xlsx";
import { badRequest, toErrorResponse } from "@/lib/utils/errors";
import { searchParamsToObject } from "@/lib/utils/request";
import { toISODate } from "@/lib/utils/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/reports/export?format=csv|xlsx&type=…
 * PDF is produced in the browser from the same report payload, so it is not
 * handled here.
 */
export async function GET(request: Request) {
  try {
    await requirePermission("report:export");

    const params = new URL(request.url).searchParams;
    const format = (params.get("format") ?? "csv").toLowerCase();
    if (format !== "csv" && format !== "xlsx") {
      throw badRequest("Unsupported export format. Use csv or xlsx.");
    }

    const query = searchParamsToObject(params);
    delete query.format;

    const [report, settings] = await Promise.all([buildReport(query), getSettings()]);
    const stamp = toISODate(new Date(), settings.timezone);
    const slug = `${report.type}-report-${stamp}`;

    if (format === "csv") {
      return new NextResponse(reportToCsv(report, settings.timezone), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${slug}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const buffer = await reportToXlsx(report, settings.timezone);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${slug}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
