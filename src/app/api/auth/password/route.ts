import { NextResponse } from "next/server";
import { AuditAction, AuditEntity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clientIp, requireUser } from "@/lib/auth/guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { changePasswordSchema } from "@/lib/validation/schemas";
import { recordAudit } from "@/lib/services/audit";
import { badRequest, toErrorResponse } from "@/lib/utils/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH /api/auth/password — a user changes their own password. */
export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireUser();
    const body = await request.json().catch(() => ({}));
    const data = changePasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, name: true, passwordHash: true },
    });
    if (!user) throw badRequest("Account not found.");

    const valid = await verifyPassword(data.currentPassword, user.passwordHash);
    if (!valid) {
      throw badRequest("Your current password is incorrect.", {
        currentPassword: ["Your current password is incorrect."],
      });
    }

    if (data.currentPassword === data.newPassword) {
      throw badRequest("The new password must be different from the current one.", {
        newPassword: ["Choose a password you have not used before."],
      });
    }

    const passwordHash = await hashPassword(data.newPassword);
    const ip = await clientIp();

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      await recordAudit(
        {
          userId: user.id,
          action: AuditAction.USER_UPDATED,
          entityType: AuditEntity.USER,
          entityId: user.id,
          summary: `${user.name} changed their own password`,
          newValues: { passwordChanged: true },
          ipAddress: ip,
        },
        tx,
      );
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
