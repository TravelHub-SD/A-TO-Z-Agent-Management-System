import { NextResponse } from "next/server";
import { getPayment } from "@/lib/services/payments";
import { requirePermission } from "@/lib/auth/guard";
import { toErrorResponse } from "@/lib/utils/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** GET /api/payments/:id */
export async function GET(_request: Request, { params }: Params) {
  try {
    await requirePermission("payment:view");
    const { id } = await params;
    return NextResponse.json({ payment: await getPayment(id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
