import { NextResponse } from "next/server";
import { createTicket, listTickets, summariseTickets } from "@/lib/services/tickets";
import { clientIp, requirePermission } from "@/lib/auth/guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/utils/errors";
import { searchParamsToObject } from "@/lib/utils/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/tickets — filtered, sorted, paginated ticket list plus totals. */
export async function GET(request: Request) {
  try {
    await requirePermission("ticket:view");
    const query = searchParamsToObject(new URL(request.url).searchParams);
    const [page, summary] = await Promise.all([
      listTickets(query),
      summariseTickets(query),
    ]);
    return NextResponse.json({ ...page, summary });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** POST /api/tickets — create an UNPAID ticket for an agent. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requirePermission("ticket:create");
    const body = await request.json().catch(() => ({}));
    const ticket = await createTicket(body, { id: user.id, ip: await clientIp() });
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
