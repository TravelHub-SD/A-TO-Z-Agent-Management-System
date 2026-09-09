import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readSessionCookie, type SessionUser } from "@/lib/auth/session";
import { can, type Permission } from "@/lib/auth/permissions";
import { forbidden, unauthorized } from "@/lib/utils/errors";

/**
 * The cookie proves *who* signed in; the database decides whether they are
 * still allowed in. Deactivating a user therefore locks them out immediately
 * instead of when their token expires. `cache` keeps this to one query per
 * request even when several server components ask for the current user.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await readSessionCookie();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
});

/** For pages: bounce to login, preserving where the user was heading. */
export async function requirePageUser(returnTo?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const target = returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login";
    redirect(target);
  }
  return user;
}

/** For API routes and services: throw a typed 401/403 instead of redirecting. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}

export async function requirePermission(
  permission: Permission,
): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) throw forbidden();
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== Role.ADMIN) throw forbidden("Administrator access required.");
  return user;
}

/** Best-effort client IP for the audit trail behind a proxy. */
export async function clientIp(): Promise<string | undefined> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim();
  return h.get("x-real-ip") ?? undefined;
}
