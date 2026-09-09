import { NextResponse } from "next/server";
import { listAuditLogs } from "@/lib/services/audit";
import { requirePermission } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/utils/errors";
import { searchParamsToObject } from "@/lib/utils/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/audit-logs — the activity trail, filtered and paginated. */
export async function GET(request: Request) {
  try {
    await requirePermission("audit:view");
    const query = searchParamsToObject(new URL(request.url).searchParams);
    return NextResponse.json(await listAuditLogs(query));
  } catch (error) {
    return toErrorResponse(error);
  }
}
