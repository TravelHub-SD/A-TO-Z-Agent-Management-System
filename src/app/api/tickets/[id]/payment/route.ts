import { NextResponse } from "next/server";
import { recordPayment } from "@/lib/services/payments";
import { clientIp, requirePermission } from "@/lib/auth/guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/utils/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/tickets/:id/payment
 * Records the agent's payment and marks the ticket PAID in one atomic
 * transaction. Requires a 4-digit transaction number.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const user = await requirePermission("payment:create");
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const payment = await recordPayment(id, body, { id: user.id, ip: await clientIp() });
    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
