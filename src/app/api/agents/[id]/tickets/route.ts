import { NextResponse } from "next/server";
import { listTickets, summariseTickets } from "@/lib/services/tickets";
import { requirePermission } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/utils/errors";
import { searchParamsToObject } from "@/lib/utils/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** GET /api/agents/:id/tickets — that agent's tickets, filtered and paged. */
export async function GET(request: Request, { params }: Params) {
  try {
    await requirePermission("ticket:view");
    const { id } = await params;
    const query = { ...searchParamsToObject(new URL(request.url).searchParams), agentId: id };

    const [page, summary] = await Promise.all([
      listTickets(query),
      summariseTickets(query),
    ]);
    return NextResponse.json({ ...page, summary });
  } catch (error) {
    return toErrorResponse(error);
  }
}
