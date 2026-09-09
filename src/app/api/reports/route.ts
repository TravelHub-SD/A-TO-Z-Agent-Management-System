import { NextResponse } from "next/server";
import { buildReport } from "@/lib/services/reports";
import { requirePermission } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/utils/errors";
import { searchParamsToObject } from "@/lib/utils/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/reports?type=agent|payment|outstanding|ticket */
export async function GET(request: Request) {
  try {
    await requirePermission("report:view");
    const query = searchParamsToObject(new URL(request.url).searchParams);
    return NextResponse.json({ report: await buildReport(query) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
