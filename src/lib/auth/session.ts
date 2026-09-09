import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { Role } from "@prisma/client";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

/**
 * Sessions are stateless HS256 JWTs held in an httpOnly, SameSite=Lax cookie.
 * The token carries only an id/role/name/email claim set; every server-side
 * entry point re-loads the user from the database, so deactivating an account
 * takes effect on the next request rather than when the token expires.
 */

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type SessionPayload = JWTPayload & SessionUser;

function sessionMaxAgeSeconds() {
  const hours = Number(process.env.AUTH_SESSION_MAX_AGE_HOURS ?? 12);
  return (Number.isFinite(hours) && hours > 0 ? hours : 12) * 3600;
}

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or too short. Set a value of at least 32 characters.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("atoz-ams")
    .setAudience("atoz-ams")
    .setSubject(user.id)
    .setExpirationTime(`${sessionMaxAgeSeconds()}s`)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, secretKey(), {
      issuer: "atoz-ams",
      audience: "atoz-ams",
    });
    if (!payload.id || !payload.email) return null;
    return {
      id: String(payload.id),
      email: String(payload.email),
      name: String(payload.name ?? ""),
      role: payload.role === Role.ADMIN ? Role.ADMIN : Role.STAFF,
    };
  } catch {
    return null;
  }
}

export async function createSessionCookie(user: SessionUser) {
  const token = await signSessionToken(user);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds(),
  });
}

export async function destroySessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function readSessionCookie(): Promise<SessionUser | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE_NAME)?.value);
}
