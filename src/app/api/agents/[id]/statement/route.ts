import { NextResponse } from "next/server";
import { getAgentStatement } from "@/lib/services/statements";
import { requirePermission } from "@/lib/auth/guard";
import { statementQuerySchema } from "@/lib/validation/schemas";
import { toErrorResponse } from "@/lib/utils/errors";
import { searchParamsToObject } from "@/lib/utils/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** GET /api/agents/:id/statement?from=&to= */
export async function GET(request: Request, { params }: Params) {
  try {
    await requirePermission("agent:view");
    const { id } = await params;
    const range = statementQuerySchema.parse(
      searchParamsToObject(new URL(request.url).searchParams),
    );
    return NextResponse.json({ statement: await getAgentStatement(id, range) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
