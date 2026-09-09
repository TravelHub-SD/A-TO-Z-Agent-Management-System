import { NextResponse } from "next/server";
import { AuditAction, AuditEntity } from "@prisma/client";
import { loginSchema } from "@/lib/validation/schemas";
import { getUserForAuth, touchLastLogin } from "@/lib/services/users";
import { fakeVerify, verifyPassword } from "@/lib/auth/password";
import { createSessionCookie } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/auth/csrf";
import {
  LOGIN_LIMIT,
  LOGIN_WINDOW_MS,
  rateLimit,
  resetRateLimit,
} from "@/lib/auth/rate-limit";
import { recordAuditSafe } from "@/lib/services/audit";
import { toErrorResponse, unauthorized, tooManyRequests } from "@/lib/utils/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ipOf(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** POST /api/auth/login — exchange credentials for a session cookie. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const ip = ipOf(request);
    const body = await request.json().catch(() => ({}));
    const { email, password } = loginSchema.parse(body);

    // Limit by IP and by account so neither a single host nor a single
    // targeted account can be brute-forced.
    const ipLimit = rateLimit(`login:ip:${ip}`, LOGIN_LIMIT * 4, LOGIN_WINDOW_MS);
    const userLimit = rateLimit(`login:user:${email}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
    if (!ipLimit.allowed || !userLimit.allowed) {
      const retryAfter = Math.max(ipLimit.retryAfterSeconds, userLimit.retryAfterSeconds);
      throw tooManyRequests(
        `Too many sign-in attempts. Try again in ${Math.ceil(retryAfter / 60)} minute(s).`,
      );
    }

    const user = await getUserForAuth(email);

    if (!user) {
      await fakeVerify();
      throw unauthorized("Incorrect email or password.");
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await recordAuditSafe({
        userId: user.id,
        action: AuditAction.LOGIN_FAILED,
        entityType: AuditEntity.SESSION,
        entityId: user.id,
        summary: `Failed sign-in attempt for ${user.email}`,
        ipAddress: ip,
      });
      throw unauthorized("Incorrect email or password.");
    }

    if (!user.isActive) {
      throw unauthorized("This account has been deactivated. Contact an administrator.");
    }

    resetRateLimit(`login:user:${email}`);

    await createSessionCookie({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    await touchLastLogin(user.id);
    await recordAuditSafe({
      userId: user.id,
      action: AuditAction.LOGIN,
      entityType: AuditEntity.SESSION,
      entityId: user.id,
      summary: `${user.name} signed in`,
      ipAddress: ip,
    });

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
