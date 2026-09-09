import "server-only";
import { AuditAction, AuditEntity, Prisma, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/services/audit";
import {
  ticketCreateSchema,
  ticketQuerySchema,
  ticketUpdateSchema,
  type TicketQuery,
} from "@/lib/validation/schemas";
import { badRequest, conflict, notFound } from "@/lib/utils/errors";
import { toMoneyString } from "@/lib/utils/currency";
import { daysBetween, parseDateFilter } from "@/lib/utils/dates";
import type { Paginated, TicketDTO } from "@/lib/services/types";

const ticketInclude = {
  agent: { select: { id: true, name: true, code: true } },
  creator: { select: { id: true, name: true } },
  payment: {
    include: { user: { select: { id: true, name: true } } },
  },
} satisfies Prisma.TicketInclude;

/** Hard ceiling on rows pulled into memory for a single report. */
export const MAX_REPORT_ROWS = 5000;

type TicketRow = Prisma.TicketGetPayload<{ include: typeof ticketInclude }>;

export function toTicketDTO(row: TicketRow): TicketDTO {
  return {
    id: row.id,
    pnr: row.pnr,
    amount: toMoneyString(row.amount),
    currency: row.currency,
    status: row.status,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    agent: row.agent,
    createdBy: row.creator,
    payment: row.payment
      ? {
          id: row.payment.id,
          transactionNumber: row.payment.transactionNumber,
          amount: toMoneyString(row.payment.amount),
          currency: row.payment.currency,
          paidAt: row.payment.paidAt.toISOString(),
          paidBy: row.payment.user,
          notes: row.payment.notes,
        }
      : null,
    // For a paid ticket this freezes at the age it had when it was settled.
    daysOutstanding:
      row.status === TicketStatus.PAID && row.payment
        ? daysBetween(row.createdAt, row.payment.paidAt)
        : daysBetween(row.createdAt),
  };
}

export function buildTicketWhere(query: TicketQuery): Prisma.TicketWhereInput {
  const where: Prisma.TicketWhereInput = {};

  if (query.agentId) where.agentId = query.agentId;
  if (query.status) where.status = query.status as TicketStatus;

  const from = parseDateFilter(query.from, "start");
  const to = parseDateFilter(query.to, "end");
  if (from || to) {
    where.createdAt = { ...(from && { gte: from }), ...(to && { lte: to }) };
  }

  if (query.q) {
    where.OR = [
      { pnr: { contains: query.q, mode: "insensitive" } },
      { agent: { name: { contains: query.q, mode: "insensitive" } } },
      { agent: { code: { contains: query.q, mode: "insensitive" } } },
      {
        payment: {
          transactionNumber: { contains: query.q, mode: "insensitive" },
        },
      },
    ];
  }

  return where;
}

function ticketOrderBy(query: TicketQuery): Prisma.TicketOrderByWithRelationInput {
  if (query.sort === "paidAt") return { payment: { paidAt: query.dir } };
  return { [query.sort]: query.dir };
}

export async function listTickets(
  rawQuery: Partial<TicketQuery>,
): Promise<Paginated<TicketDTO>> {
  const query = ticketQuerySchema.parse(rawQuery);
  const where = buildTicketWhere(query);

  const [total, rows] = await Promise.all([
    prisma.ticket.count({ where }),
    prisma.ticket.findMany({
      where,
      include: ticketInclude,
      orderBy: ticketOrderBy(query),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    items: rows.map(toTicketDTO),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

/**
 * Unpaginated read for reports and exports. The pagination schema caps API
 * page size at 200 to protect the list endpoints; a report legitimately needs
 * the whole filtered set, so it takes this path with its own explicit cap.
 */
export async function listTicketsForReport(
  rawQuery: Partial<TicketQuery>,
  limit = MAX_REPORT_ROWS,
): Promise<TicketDTO[]> {
  const query = ticketQuerySchema.parse({ ...rawQuery, page: 1, pageSize: 1 });
  const rows = await prisma.ticket.findMany({
    where: buildTicketWhere(query),
    include: ticketInclude,
    orderBy: ticketOrderBy(query),
    take: Math.min(limit, MAX_REPORT_ROWS),
  });
  return rows.map(toTicketDTO);
}

/** Totals for the filtered set, so page footers show the whole result. */
export async function summariseTickets(rawQuery: Partial<TicketQuery>) {
  const query = ticketQuerySchema.parse(rawQuery);
  const where = buildTicketWhere(query);

  const grouped = await prisma.ticket.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
    _sum: { amount: true },
  });

  let paidCount = 0;
  let unpaidCount = 0;
  let paidAmount = 0;
  let unpaidAmount = 0;

  for (const group of grouped) {
    if (group.status === TicketStatus.PAID) {
      paidCount = group._count._all;
      paidAmount = Number(group._sum.amount ?? 0);
    } else {
      unpaidCount = group._count._all;
      unpaidAmount = Number(group._sum.amount ?? 0);
    }
  }

  return {
    count: paidCount + unpaidCount,
    paidCount,
    unpaidCount,
    totalAmount: (paidAmount + unpaidAmount).toFixed(2),
    paidAmount: paidAmount.toFixed(2),
    outstandingAmount: unpaidAmount.toFixed(2),
  };
}

export async function getTicket(id: string): Promise<TicketDTO> {
  const row = await prisma.ticket.findUnique({ where: { id }, include: ticketInclude });
  if (!row) throw notFound("Ticket not found.");
  return toTicketDTO(row);
}

export async function createTicket(
  input: unknown,
  actor: { id: string; ip?: string },
): Promise<TicketDTO> {
  const data = ticketCreateSchema.parse(input);

  const agent = await prisma.agent.findUnique({ where: { id: data.agentId } });
  if (!agent) throw badRequest("Agent not found.", { agentId: ["Agent not found."] });
  if (!agent.isActive) {
    throw badRequest("That agent is inactive. Reactivate the agent before adding tickets.", {
      agentId: ["That agent is inactive."],
    });
  }

  // A PNR is only meaningful once per agent; the same PNR for a different
  // agent is legitimate, so the guard is scoped rather than global.
  const duplicate = await prisma.ticket.findFirst({
    where: { agentId: data.agentId, pnr: data.pnr },
    select: { id: true },
  });
  if (duplicate) {
    throw conflict(`PNR ${data.pnr} already exists for ${agent.name}.`);
  }

  const created = await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.create({
      data: {
        agentId: data.agentId,
        pnr: data.pnr,
        amount: new Prisma.Decimal(data.amount.toFixed(2)),
        currency: data.currency,
        notes: data.notes || null,
        status: TicketStatus.UNPAID,
        createdBy: actor.id,
      },
      include: ticketInclude,
    });

    await recordAudit(
      {
        userId: actor.id,
        action: AuditAction.CREATE_TICKET,
        entityType: AuditEntity.TICKET,
        entityId: ticket.id,
        summary: `Created ticket ${ticket.pnr} for ${agent.name}`,
        newValues: {
          pnr: ticket.pnr,
          agent: agent.name,
          agentCode: agent.code,
          amount: toMoneyString(ticket.amount),
          currency: ticket.currency,
          status: ticket.status,
        },
        ipAddress: actor.ip,
      },
      tx,
    );

    return ticket;
  });

  return toTicketDTO(created);
}

export async function updateTicket(
  id: string,
  input: unknown,
  actor: { id: string; ip?: string },
): Promise<TicketDTO> {
  const data = ticketUpdateSchema.parse(input);

  const before = await prisma.ticket.findUnique({
    where: { id },
    include: ticketInclude,
  });
  if (!before) throw notFound("Ticket not found.");

  // Editing a settled ticket would silently invalidate its payment record.
  if (before.status === TicketStatus.PAID) {
    throw conflict(
      "This ticket has already been paid and can no longer be edited. Reverse the payment first.",
    );
  }

  if (data.agentId && data.agentId !== before.agentId) {
    const agent = await prisma.agent.findUnique({ where: { id: data.agentId } });
    if (!agent) throw badRequest("Agent not found.", { agentId: ["Agent not found."] });
    if (!agent.isActive) {
      throw badRequest("That agent is inactive.", { agentId: ["That agent is inactive."] });
    }
  }

  const nextAgentId = data.agentId ?? before.agentId;
  const nextPnr = data.pnr ?? before.pnr;
  if (nextAgentId !== before.agentId || nextPnr !== before.pnr) {
    const duplicate = await prisma.ticket.findFirst({
      where: { agentId: nextAgentId, pnr: nextPnr, id: { not: id } },
      select: { id: true },
    });
    if (duplicate) throw conflict(`PNR ${nextPnr} already exists for that agent.`);
  }

  const patch: Prisma.TicketUpdateInput = {};
  if (data.agentId !== undefined) patch.agent = { connect: { id: data.agentId } };
  if (data.pnr !== undefined) patch.pnr = data.pnr;
  if (data.amount !== undefined) patch.amount = new Prisma.Decimal(data.amount.toFixed(2));
  if (data.currency !== undefined) patch.currency = data.currency;
  if (data.notes !== undefined) patch.notes = data.notes || null;

  const updated = await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.update({
      where: { id },
      data: patch,
      include: ticketInclude,
    });

    await recordAudit(
      {
        userId: actor.id,
        action: AuditAction.UPDATE_TICKET,
        entityType: AuditEntity.TICKET,
        entityId: id,
        summary: `Updated ticket ${ticket.pnr}`,
        oldValues: {
          pnr: before.pnr,
          agent: before.agent.name,
          amount: toMoneyString(before.amount),
          currency: before.currency,
          notes: before.notes,
        },
        newValues: {
          pnr: ticket.pnr,
          agent: ticket.agent.name,
          amount: toMoneyString(ticket.amount),
          currency: ticket.currency,
          notes: ticket.notes,
        },
        ipAddress: actor.ip,
      },
      tx,
    );

    return ticket;
  });

  return toTicketDTO(updated);
}

export async function deleteTicket(id: string, actor: { id: string; ip?: string }) {
  const before = await prisma.ticket.findUnique({
    where: { id },
    include: ticketInclude,
  });
  if (!before) throw notFound("Ticket not found.");
  if (before.status === TicketStatus.PAID) {
    throw conflict("A paid ticket cannot be deleted. Reverse the payment first.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.ticket.delete({ where: { id } });
    await recordAudit(
      {
        userId: actor.id,
        action: AuditAction.DELETE_TICKET,
        entityType: AuditEntity.TICKET,
        entityId: id,
        summary: `Deleted ticket ${before.pnr} (${before.agent.name})`,
        oldValues: {
          pnr: before.pnr,
          agent: before.agent.name,
          amount: toMoneyString(before.amount),
          currency: before.currency,
          status: before.status,
        },
        ipAddress: actor.ip,
      },
      tx,
    );
  });

  return { id };
}

/** Outstanding view: unpaid tickets oldest first, plus headline totals. */
export async function listUnpaidTickets(rawQuery: Partial<TicketQuery>) {
  const query = ticketQuerySchema.parse({
    ...rawQuery,
    status: TicketStatus.UNPAID,
    sort: rawQuery.sort ?? "createdAt",
    dir: rawQuery.dir ?? "asc",
  });
  const [page, summary] = await Promise.all([
    listTickets(query),
    summariseTickets(query),
  ]);
  return { ...page, summary };
}
