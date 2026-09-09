import { NextResponse } from "next/server";
import { TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guard";
import { toMoneyString } from "@/lib/utils/currency";
import { toErrorResponse } from "@/lib/utils/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type SearchHit = {
  kind: "agent" | "ticket" | "payment";
  id: string;
  href: string;
  title: string;
  subtitle: string;
  meta?: string;
  status?: TicketStatus;
  amount?: string;
  currency?: string;
};

/**
 * GET /api/search?q=… — global lookup across agent name/code, PNR and
 * transaction number. Case-insensitive, index-backed, capped per category so
 * the palette stays fast.
 */
export async function GET(request: Request) {
  try {
    await requireUser();

    const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
    if (q.length < 2) return NextResponse.json({ hits: [] });

    const [agents, tickets, payments] = await Promise.all([
      prisma.agent.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true, isActive: true },
      }),
      prisma.ticket.findMany({
        where: { pnr: { contains: q, mode: "insensitive" } },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { agent: { select: { name: true, code: true } } },
      }),
      prisma.payment.findMany({
        where: { transactionNumber: { contains: q, mode: "insensitive" } },
        take: 5,
        orderBy: { paidAt: "desc" },
        include: { ticket: { include: { agent: { select: { name: true } } } } },
      }),
    ]);

    const hits: SearchHit[] = [
      ...agents.map<SearchHit>((a) => ({
        kind: "agent",
        id: a.id,
        href: `/agents/${a.id}`,
        title: a.name,
        subtitle: a.code,
        meta: a.isActive ? "Active" : "Inactive",
      })),
      ...tickets.map<SearchHit>((t) => ({
        kind: "ticket",
        id: t.id,
        href: `/tickets/${t.id}`,
        title: t.pnr,
        subtitle: `${t.agent.name} (${t.agent.code})`,
        status: t.status,
        amount: toMoneyString(t.amount),
        currency: t.currency,
      })),
      ...payments.map<SearchHit>((p) => ({
        kind: "payment",
        id: p.id,
        href: `/payments/${p.id}`,
        title: `Transaction ${p.transactionNumber}`,
        subtitle: `${p.ticket.pnr} — ${p.ticket.agent.name}`,
        amount: toMoneyString(p.amount),
        currency: p.currency,
      })),
    ];

    return NextResponse.json({ hits });
  } catch (error) {
    return toErrorResponse(error);
  }
}
