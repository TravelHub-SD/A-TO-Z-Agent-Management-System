import { NextResponse } from "next/server";
import { listPayments } from "@/lib/services/payments";
import { requirePermission } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/utils/errors";
import { searchParamsToObject } from "@/lib/utils/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/payments — payment history, searchable by transaction number. */
export async function GET(request: Request) {
  try {
    await requirePermission("payment:view");
    const query = searchParamsToObject(new URL(request.url).searchParams);
    return NextResponse.json(await listPayments(query));
  } catch (error) {
    return toErrorResponse(error);
  }
}
