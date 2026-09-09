import { NextResponse } from "next/server";
import { updateUser } from "@/lib/services/users";
import { clientIp, requirePermission } from "@/lib/auth/guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/utils/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/users/:id — rename, change role, deactivate or reset password. */
export async function PATCH(request: Request, { params }: Params) {
  try {
    assertSameOrigin(request);
    const actor = await requirePermission("user:manage");
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const user = await updateUser(id, body, { id: actor.id, ip: await clientIp() });
    return NextResponse.json({ user });
  } catch (error) {
    return toErrorResponse(error);
  }
}
