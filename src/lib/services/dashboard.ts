import "server-only";
import { TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/services/settings";
import { listTickets } from "@/lib/services/tickets";
import { toMoneyString } from "@/lib/utils/currency";
import type {
  DashboardStats,
  MonthlyPoint,
  TopAgentPoint,
} from "@/lib/services/types";

/**
 * Every figure here is aggregated by the database. Nothing loads whole tables
 * into memory, so the dashboard stays fast as ticket volume grows.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const settings = await getSettings();

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const overdueBefore = new Date(
    now.getTime() - settings.outstandingCriticalDays * 86_400_000,
  );

  const [
    totalAgents,
    activeAgents,
    ticketGroups,
    ticketsThisMonth,
    paymentsThisMonth,
    overdueTickets,
  ] = await Promise.all([
    prisma.agent.count(),
    prisma.agent.count({ where: { isActive: true } }),
    prisma.ticket.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.ticket.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.payment.aggregate({
      where: { paidAt: { gte: monthStart } },
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.ticket.count({
      where: { status: TicketStatus.UNPAID, createdAt: { lt: overdueBefore } },
    }),
  ]);

  let paidTickets = 0;
  let unpaidTickets = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;

  for (const group of ticketGroups) {
    if (group.status === TicketStatus.PAID) {
      paidTickets = group._count._all;
      totalPaid = Number(group._sum.amount ?? 0);
    } else {
      unpaidTickets = group._count._all;
      totalOutstanding = Number(group._sum.amount ?? 0);
    }
  }

  return {
    currency: settings.defaultCurrency,
    totalAgents,
    activeAgents,
    totalTickets: paidTickets + unpaidTickets,
    paidTickets,
    unpaidTickets,
    totalAmount: (totalPaid + totalOutstanding).toFixed(2),
    totalPaid: totalPaid.toFixed(2),
    totalOutstanding: totalOutstanding.toFixed(2),
    paymentsThisMonth: paymentsThisMonth._count._all,
    paidThisMonth: toMoneyString(paymentsThisMonth._sum.amount ?? 0),
    ticketsThisMonth,
    overdueTickets,
  };
}

/** Billed vs collected over the last `months` calendar months. */
export async function getMonthlyTrend(months = 6): Promise<MonthlyPoint[]> {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1),
  );

  const [tickets, payments] = await Promise.all([
    prisma.$queryRaw<Array<{ bucket: Date; total: unknown }>>`
      SELECT date_trunc('month', created_at) AS bucket, SUM(amount) AS total
      FROM tickets
      WHERE created_at >= ${start}
      GROUP BY 1
    `,
    prisma.$queryRaw<Array<{ bucket: Date; total: unknown }>>`
      SELECT date_trunc('month', paid_at) AS bucket, SUM(amount) AS total
      FROM payments
      WHERE paid_at >= ${start}
      GROUP BY 1
    `,
  ]);

  const key = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

  const billed = new Map(tickets.map((r) => [key(new Date(r.bucket)), Number(r.total ?? 0)]));
  const collected = new Map(
    payments.map((r) => [key(new Date(r.bucket)), Number(r.total ?? 0)]),
  );

  const points: MonthlyPoint[] = [];
  for (let i = 0; i < months; i += 1) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    const k = key(d);
    points.push({
      month: k,
      label: new Intl.DateTimeFormat("en-GB", {
        month: "short",
        timeZone: "UTC",
      }).format(d),
      billed: (billed.get(k) ?? 0).toFixed(2),
      collected: (collected.get(k) ?? 0).toFixed(2),
    });
  }
  return points;
}

/** Agents holding the largest unpaid balances — "who owes us money". */
export async function getTopOutstandingAgents(limit = 5): Promise<TopAgentPoint[]> {
  const grouped = await prisma.ticket.groupBy({
    by: ["agentId"],
    where: { status: TicketStatus.UNPAID },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: limit,
  });

  if (grouped.length === 0) return [];

  const agents = await prisma.agent.findMany({
    where: { id: { in: grouped.map((g) => g.agentId) } },
    select: { id: true, name: true, code: true },
  });
  const byId = new Map(agents.map((a) => [a.id, a]));

  return grouped.map((g) => {
    const agent = byId.get(g.agentId);
    return {
      agentId: g.agentId,
      name: agent?.name ?? "Unknown agent",
      code: agent?.code ?? "—",
      outstanding: toMoneyString(g._sum.amount ?? 0),
    };
  });
}

export async function getRecentTickets(limit = 8) {
  const page = await listTickets({ page: 1, pageSize: limit, sort: "createdAt", dir: "desc" });
  return page.items;
}
