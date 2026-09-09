import { NextResponse } from "next/server";
import {
  getAgentWithTotals,
  setAgentActive,
  updateAgent,
} from "@/lib/services/agents";
import { clientIp, requirePermission } from "@/lib/auth/guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/utils/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** GET /api/agents/:id */
export async function GET(_request: Request, { params }: Params) {
  try {
    await requirePermission("agent:view");
    const { id } = await params;
    return NextResponse.json({ agent: await getAgentWithTotals(id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * PATCH /api/agents/:id
 * Toggling `isActive` is a separate, ADMIN-only capability from editing the
 * agent's details, so a body that only changes the status routes through the
 * dedicated guard.
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const keys = Object.keys(body);
    const statusOnly = keys.length === 1 && keys[0] === "isActive";

    if (statusOnly) {
      const user = await requirePermission("agent:toggle-active");
      const agent = await setAgentActive(id, Boolean(body.isActive), {
        id: user.id,
        ip: await clientIp(),
      });
      return NextResponse.json({ agent });
    }

    const user = await requirePermission("agent:update");
    if ("isActive" in body) await requirePermission("agent:toggle-active");

    const agent = await updateAgent(id, body, { id: user.id, ip: await clientIp() });
    return NextResponse.json({ agent });
  } catch (error) {
    return toErrorResponse(error);
  }
}
