import { NextResponse } from "next/server";
import { reversePayment } from "@/lib/services/payments";
import { clientIp, requirePermission } from "@/lib/auth/guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/utils/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/payments/:id/reverse
 * ADMIN only. Requires an explicit confirmation and a written reason; the
 * deleted payment is preserved in full in the audit log.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const user = await requirePermission("payment:reverse");
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await reversePayment(id, body, { id: user.id, ip: await clientIp() });
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
