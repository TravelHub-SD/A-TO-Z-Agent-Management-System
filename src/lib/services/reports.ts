import "server-only";
import { TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { reportQuerySchema, type ReportQuery } from "@/lib/validation/schemas";
import { listPaymentsForReport, summarisePayments } from "@/lib/services/payments";
import { listTicketsForReport, summariseTickets } from "@/lib/services/tickets";
import { getAgent } from "@/lib/services/agents";
import { getSettings } from "@/lib/services/settings";
import { daysBetween } from "@/lib/utils/dates";

/**
 * Reports share one shape — a title, a period, headline totals, and a table of
 * columns + rows — so the UI, the CSV writer and the Excel writer all consume
 * the same structure and never drift apart.
 */
export type ReportColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
  type?: "text" | "money" | "date" | "number" | "status";
};

export type ReportRow = Record<string, string | number | null>;

export type ReportResult = {
  type: ReportQuery["type"];
  title: string;
  subtitle: string;
  period: { from: string | null; to: string | null };
  currency: string;
  generatedAt: string;
  summary: Array<{ label: string; value: string; tone?: "paid" | "unpaid" | "neutral" }>;
  columns: ReportColumn[];
  rows: ReportRow[];
};

export async function buildReport(rawQuery: Partial<ReportQuery>): Promise<ReportResult> {
  const query = reportQuerySchema.parse(rawQuery);
  const settings = await getSettings();
  const period = { from: query.from || null, to: query.to || null };
  const base = {
    period,
    currency: settings.defaultCurrency,
    generatedAt: new Date().toISOString(),
  };

  switch (query.type) {
    case "agent":
      return { ...base, ...(await agentReport(query, settings.defaultCurrency)) };
    case "payment":
      return { ...base, ...(await paymentReport(query)) };
    case "outstanding":
      return { ...base, ...(await outstandingReport(query, settings)) };
    case "ticket":
    default:
      return { ...base, ...(await ticketReport(query)) };
  }
}

async function agentReport(query: ReportQuery, currency: string) {
  if (!query.agentId) {
    // Without a specific agent, report across every agent's position.
    const agents = await prisma.agent.findMany({ orderBy: { name: "asc" } });
    const grouped = await prisma.ticket.groupBy({
      by: ["agentId", "status"],
      _count: { _all: true },
      _sum: { amount: true },
    });

    const totals = new Map<string, { tickets: number; paid: number; unpaid: number }>();
    for (const a of agents) totals.set(a.id, { tickets: 0, paid: 0, unpaid: 0 });
    for (const g of grouped) {
      const entry = totals.get(g.agentId);
      if (!entry) continue;
      entry.tickets += g._count._all;
      if (g.status === TicketStatus.PAID) entry.paid += Number(g._sum.amount ?? 0);
      else entry.unpaid += Number(g._sum.amount ?? 0);
    }

    const rows: ReportRow[] = agents.map((a) => {
      const t = totals.get(a.id)!;
      return {
        name: a.name,
        code: a.code,
        status: a.isActive ? "Active" : "Inactive",
        tickets: t.tickets,
        total: (t.paid + t.unpaid).toFixed(2),
        paid: t.paid.toFixed(2),
        outstanding: t.unpaid.toFixed(2),
      };
    });

    const grandTotal = rows.reduce((s, r) => s + Number(r.total), 0);
    const grandPaid = rows.reduce((s, r) => s + Number(r.paid), 0);
    const grandOutstanding = rows.reduce((s, r) => s + Number(r.outstanding), 0);

    return {
      type: "agent" as const,
      title: "Agent Report",
      subtitle: "Position across all agents",
      summary: [
        { label: "Agents", value: String(agents.length) },
        { label: "Total billed", value: grandTotal.toFixed(2) },
        { label: "Total paid", value: grandPaid.toFixed(2), tone: "paid" as const },
        { label: "Outstanding", value: grandOutstanding.toFixed(2), tone: "unpaid" as const },
      ],
      columns: [
        { key: "name", label: "Agent" },
        { key: "code", label: "Code" },
        { key: "status", label: "Status", type: "status" as const },
        { key: "tickets", label: "Tickets", align: "right" as const, type: "number" as const },
        { key: "total", label: "Total", align: "right" as const, type: "money" as const },
        { key: "paid", label: "Paid", align: "right" as const, type: "money" as const },
        { key: "outstanding", label: "Outstanding", align: "right" as const, type: "money" as const },
      ],
      rows,
    };
  }

  const agent = await getAgent(query.agentId);
  const tickets = await listTicketsForReport({
    agentId: query.agentId,
    status: query.status || undefined,
    from: query.from,
    to: query.to,
    sort: "createdAt",
    dir: "asc",
  });
  const summary = await summariseTickets({
    agentId: query.agentId,
    status: query.status || undefined,
    from: query.from,
    to: query.to,
  });

  return {
    type: "agent" as const,
    title: "Agent Report",
    subtitle: `${agent.name} (${agent.code})`,
    summary: [
      { label: "Tickets", value: String(summary.count) },
      { label: "Total billed", value: summary.totalAmount },
      { label: "Paid", value: summary.paidAmount, tone: "paid" as const },
      { label: "Outstanding", value: summary.outstandingAmount, tone: "unpaid" as const },
    ],
    columns: ticketColumns(),
    rows: tickets.map(ticketRow),
    currency: tickets[0]?.currency ?? currency,
  };
}

async function paymentReport(query: ReportQuery) {
  const paymentFilters = {
    agentId: query.agentId || undefined,
    from: query.from,
    to: query.to,
  };
  const [payments, totals] = await Promise.all([
    listPaymentsForReport({ ...paymentFilters, sort: "paidAt", dir: "asc" }),
    summarisePayments(paymentFilters),
  ]);

  const agent = query.agentId ? await getAgent(query.agentId) : null;

  return {
    type: "payment" as const,
    title: "Payment Report",
    subtitle: agent ? `${agent.name} (${agent.code})` : "All agents",
    summary: [
      { label: "Payments", value: String(totals.count) },
      { label: "Total collected", value: totals.totalAmount, tone: "paid" as const },
    ],
    columns: [
      { key: "transactionNumber", label: "Transaction No." },
      { key: "pnr", label: "PNR" },
      { key: "agent", label: "Agent" },
      { key: "amount", label: "Amount", align: "right" as const, type: "money" as const },
      { key: "paidBy", label: "Recorded by" },
      { key: "paidAt", label: "Paid at", type: "date" as const },
    ],
    rows: payments.map<ReportRow>((p) => ({
      transactionNumber: p.transactionNumber,
      pnr: p.ticket.pnr,
      agent: `${p.ticket.agent.name} (${p.ticket.agent.code})`,
      amount: p.amount,
      paidBy: p.paidBy?.name ?? "—",
      paidAt: p.paidAt,
    })),
  };
}

async function outstandingReport(
  query: ReportQuery,
  settings: { outstandingCriticalDays: number },
) {
  const tickets = await listTicketsForReport({
    agentId: query.agentId || undefined,
    status: TicketStatus.UNPAID,
    from: query.from,
    to: query.to,
    sort: "createdAt",
    dir: "asc",
  });
  const summary = await summariseTickets({
    agentId: query.agentId || undefined,
    status: TicketStatus.UNPAID,
    from: query.from,
    to: query.to,
  });

  const agent = query.agentId ? await getAgent(query.agentId) : null;
  const overdue = tickets.filter(
    (t) => t.daysOutstanding >= settings.outstandingCriticalDays,
  ).length;

  return {
    type: "outstanding" as const,
    title: "Outstanding Report",
    subtitle: agent ? `${agent.name} (${agent.code})` : "All unpaid tickets",
    summary: [
      { label: "Unpaid tickets", value: String(summary.unpaidCount) },
      { label: "Total outstanding", value: summary.outstandingAmount, tone: "unpaid" as const },
      { label: `Over ${settings.outstandingCriticalDays} days`, value: String(overdue) },
    ],
    columns: [
      { key: "pnr", label: "PNR" },
      { key: "agent", label: "Agent" },
      { key: "amount", label: "Amount", align: "right" as const, type: "money" as const },
      { key: "createdAt", label: "Created", type: "date" as const },
      { key: "days", label: "Days outstanding", align: "right" as const, type: "number" as const },
    ],
    rows: tickets.map<ReportRow>((t) => ({
      pnr: t.pnr,
      agent: `${t.agent.name} (${t.agent.code})`,
      amount: t.amount,
      createdAt: t.createdAt,
      days: daysBetween(t.createdAt),
    })),
  };
}

async function ticketReport(query: ReportQuery) {
  const tickets = await listTicketsForReport({
    agentId: query.agentId || undefined,
    status: query.status || undefined,
    from: query.from,
    to: query.to,
    sort: "createdAt",
    dir: "asc",
  });
  const summary = await summariseTickets({
    agentId: query.agentId || undefined,
    status: query.status || undefined,
    from: query.from,
    to: query.to,
  });
  const agent = query.agentId ? await getAgent(query.agentId) : null;

  return {
    type: "ticket" as const,
    title: "Ticket Report",
    subtitle: agent ? `${agent.name} (${agent.code})` : "All agents",
    summary: [
      { label: "Tickets", value: String(summary.count) },
      { label: "Total billed", value: summary.totalAmount },
      { label: "Paid", value: summary.paidAmount, tone: "paid" as const },
      { label: "Outstanding", value: summary.outstandingAmount, tone: "unpaid" as const },
    ],
    columns: ticketColumns(),
    rows: tickets.map(ticketRow),
  };
}

function ticketColumns(): ReportColumn[] {
  return [
    { key: "pnr", label: "PNR" },
    { key: "agent", label: "Agent" },
    { key: "amount", label: "Amount", align: "right", type: "money" },
    { key: "status", label: "Status", type: "status" },
    { key: "transactionNumber", label: "Transaction No." },
    { key: "createdAt", label: "Created", type: "date" },
    { key: "paidAt", label: "Paid", type: "date" },
  ];
}

function ticketRow(t: {
  pnr: string;
  agent: { name: string; code: string };
  amount: string;
  status: TicketStatus;
  payment: { transactionNumber: string; paidAt: string } | null;
  createdAt: string;
}): ReportRow {
  return {
    pnr: t.pnr,
    agent: `${t.agent.name} (${t.agent.code})`,
    amount: t.amount,
    status: t.status,
    transactionNumber: t.payment?.transactionNumber ?? "—",
    createdAt: t.createdAt,
    paidAt: t.payment?.paidAt ?? "",
  };
}
