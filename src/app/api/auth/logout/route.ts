import { NextResponse } from "next/server";
import { AuditAction, AuditEntity } from "@prisma/client";
import { destroySessionCookie } from "@/lib/auth/session";
import { getCurrentUser } from "@/lib/auth/guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { recordAuditSafe } from "@/lib/services/audit";
import { toErrorResponse } from "@/lib/utils/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/auth/logout — clear the session cookie. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getCurrentUser();

    if (user) {
      await recordAuditSafe({
        userId: user.id,
        action: AuditAction.LOGOUT,
        entityType: AuditEntity.SESSION,
        entityId: user.id,
        summary: `${user.name} signed out`,
      });
    }

    await destroySessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
