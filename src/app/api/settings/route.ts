import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/services/settings";
import { clientIp, requirePermission, requireUser } from "@/lib/auth/guard";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { toErrorResponse } from "@/lib/utils/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/settings — readable by any signed-in user. */
export async function GET() {
  try {
    await requireUser();
    return NextResponse.json({ settings: await getSettings() });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** PATCH /api/settings — ADMIN only. */
export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requirePermission("settings:manage");
    const body = await request.json().catch(() => ({}));
    const settings = await updateSettings(body, { id: user.id, ip: await clientIp() });
    return NextResponse.json({ settings });
  } catch (error) {
    return toErrorResponse(error);
  }
}
