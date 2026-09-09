import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/auth/me — the signed-in user, or 401 when there is no session. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in", code: "UNAUTHORIZED" }, { status: 401 });
  }
  return NextResponse.json({ user });
}
