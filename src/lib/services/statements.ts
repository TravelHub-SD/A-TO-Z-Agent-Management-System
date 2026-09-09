import "server-only";
import { Prisma, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAgent } from "@/lib/services/agents";
import { getSettings } from "@/lib/services/settings";
import { toMoneyString } from "@/lib/utils/currency";
import { parseDateFilter } from "@/lib/utils/dates";
import type { Statement, StatementLine } from "@/lib/services/types";

/**
 * An agent's account statement.
 *
 * Tickets are debits (the agent owes A TO Z), payments are credits. Lines are
 * merged into one date-ordered ledger with a running balance. When a period is
 * given, everything before it is collapsed into an opening balance so the
 * running balance stays correct rather than restarting at zero.
 */
export async function getAgentStatement(
  agentId: string,
  range: { from?: string | null; to?: string | null } = {},
): Promise<Statement> {
  const [agent, settings] = await Promise.all([getAgent(agentId), getSettings()]);

  const from = parseDateFilter(range.from, "start");
  const to = parseDateFilter(range.to, "end");

  const [tickets, payments] = await Promise.all([
    prisma.ticket.findMany({
      where: { agentId, ...(to ? { createdAt: { lte: to } } : {}) },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        pnr: true,
        amount: true,
        currency: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.payment.findMany({
      where: { ticket: { agentId }, ...(to ? { paidAt: { lte: to } } : {}) },
      orderBy: { paidAt: "asc" },
      select: {
        id: true,
        transactionNumber: true,
        amount: true,
        currency: true,
        paidAt: true,
        ticket: { select: { id: true, pnr: true } },
      },
    }),
  ]);

  type Entry = {
    at: Date;
    type: "TICKET" | "PAYMENT";
    reference: string;
    description: string;
    amount: Prisma.Decimal;
    ticketId: string;
    paymentId?: string;
  };

  const entries: Entry[] = [
    ...tickets.map<Entry>((t) => ({
      at: t.createdAt,
      type: "TICKET",
      reference: t.pnr,
      description: "Ticket issued",
      amount: t.amount,
      ticketId: t.id,
    })),
    ...payments.map<Entry>((p) => ({
      at: p.paidAt,
      type: "PAYMENT",
      reference: p.ticket.pnr,
      description: `Payment received — transaction ${p.transactionNumber}`,
      amount: p.amount,
      ticketId: p.ticket.id,
      paymentId: p.id,
    })),
  ].sort((a, b) => {
    const diff = a.at.getTime() - b.at.getTime();
    // A ticket and its payment on the same timestamp must read debit-first.
    if (diff !== 0) return diff;
    if (a.type === b.type) return 0;
    return a.type === "TICKET" ? -1 : 1;
  });

  let balance = 0;
  let openingBalance = 0;
  const lines: StatementLine[] = [];

  for (const entry of entries) {
    const value = Number(entry.amount);
    balance += entry.type === "TICKET" ? value : -value;

    if (from && entry.at < from) {
      // Outside the period: fold into the opening balance, do not list.
      openingBalance = balance;
      continue;
    }

    lines.push({
      date: entry.at.toISOString(),
      reference: entry.reference,
      description: entry.description,
      type: entry.type,
      debit: entry.type === "TICKET" ? toMoneyString(entry.amount) : null,
      credit: entry.type === "PAYMENT" ? toMoneyString(entry.amount) : null,
      balance: balance.toFixed(2),
      ticketId: entry.ticketId,
      paymentId: entry.paymentId,
    });
  }

  // Period summary is scoped to the listed lines; the closing balance is the
  // agent's true balance as at the end of the period.
  const periodTickets = lines.filter((l) => l.type === "TICKET");
  const periodPayments = lines.filter((l) => l.type === "PAYMENT");
  const totalAmount = periodTickets.reduce((sum, l) => sum + Number(l.debit ?? 0), 0);
  const totalPaid = periodPayments.reduce((sum, l) => sum + Number(l.credit ?? 0), 0);

  const currency =
    tickets[0]?.currency ?? payments[0]?.currency ?? settings.defaultCurrency;

  return {
    agent,
    currency,
    from: range.from || null,
    to: range.to || null,
    openingBalance: openingBalance.toFixed(2),
    closingBalance: balance.toFixed(2),
    summary: {
      ticketCount: periodTickets.length,
      totalAmount: totalAmount.toFixed(2),
      totalPaid: totalPaid.toFixed(2),
      outstanding: (totalAmount - totalPaid).toFixed(2),
    },
    lines,
  };
}

/** Whole-account totals, ignoring any statement period. */
export async function getAgentAccountTotals(agentId: string) {
  const grouped = await prisma.ticket.groupBy({
    by: ["status"],
    where: { agentId },
    _count: { _all: true },
    _sum: { amount: true },
  });

  let paid = 0;
  let outstanding = 0;
  let count = 0;
  for (const g of grouped) {
    count += g._count._all;
    if (g.status === TicketStatus.PAID) paid = Number(g._sum.amount ?? 0);
    else outstanding = Number(g._sum.amount ?? 0);
  }

  return {
    ticketCount: count,
    totalAmount: (paid + outstanding).toFixed(2),
    totalPaid: paid.toFixed(2),
    outstanding: outstanding.toFixed(2),
  };
}
