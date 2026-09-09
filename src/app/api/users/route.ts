import { NextResponse } from "next/server";
import { createUser, listUsers } from "@/lib/services/users";
import { clientIp, requirePermission } from "@/lib/auth/guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/utils/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/users — ADMIN only. Password hashes are never returned. */
export async function GET() {
  try {
    await requirePermission("user:manage");
    return NextResponse.json({ users: await listUsers() });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** POST /api/users — provision an internal account. ADMIN only. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requirePermission("user:manage");
    const body = await request.json().catch(() => ({}));
    const user = await createUser(body, { id: actor.id, ip: await clientIp() });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
