import { NextResponse } from "next/server";
import { deleteTicket, getTicket, updateTicket } from "@/lib/services/tickets";
import { clientIp, requirePermission } from "@/lib/auth/guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/utils/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** GET /api/tickets/:id */
export async function GET(_request: Request, { params }: Params) {
  try {
    await requirePermission("ticket:view");
    const { id } = await params;
    return NextResponse.json({ ticket: await getTicket(id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * PATCH /api/tickets/:id — edit an unpaid ticket. Status is never settable
 * here; a ticket only becomes PAID through POST /api/tickets/:id/payment.
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const user = await requirePermission("ticket:update");
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const ticket = await updateTicket(id, body, { id: user.id, ip: await clientIp() });
    return NextResponse.json({ ticket });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** DELETE /api/tickets/:id — ADMIN only, unpaid tickets only. */
export async function DELETE(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const user = await requirePermission("ticket:delete");
    const { id } = await params;
    await deleteTicket(id, { id: user.id, ip: await clientIp() });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
