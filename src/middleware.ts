import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

/**
 * Edge gate for every internal route.
 *
 * The middleware only checks that a session token is present and well-formed —
 * it cannot reach the database from the edge runtime. Authorisation (role,
 * `is_active`) is enforced again in `requireUser`/`requirePermission` on the
 * server for every page, service call and API route, so this is a fast
 * redirect, never the only line of defence.
 */
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;

  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return false;

  try {
    await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer: "atoz-ams",
      audience: "atoz-ams",
    });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const signedIn = await hasValidSession(request);

  if (isPublic) {
    // Someone already signed in has no reason to see the login page.
    if (pathname === "/login" && signedIn) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!signedIn) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "You must sign in to continue.", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }
    const login = new URL("/login", request.url);
    const target = `${pathname}${search}`;
    if (target !== "/") login.searchParams.set("next", target);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
