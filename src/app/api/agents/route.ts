import { NextResponse } from "next/server";
import { createAgent, listAgents } from "@/lib/services/agents";
import { requirePermission } from "@/lib/auth/guard";
import { clientIp } from "@/lib/auth/guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/utils/errors";
import { searchParamsToObject } from "@/lib/utils/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/agents — paginated agent list with balances. */
export async function GET(request: Request) {
  try {
    await requirePermission("agent:view");
    const query = searchParamsToObject(new URL(request.url).searchParams);
    return NextResponse.json(await listAgents(query));
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** POST /api/agents — create an agent. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requirePermission("agent:create");
    const body = await request.json().catch(() => ({}));
    const agent = await createAgent(body, { id: user.id, ip: await clientIp() });
    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
