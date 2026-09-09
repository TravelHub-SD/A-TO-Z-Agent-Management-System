import "server-only";
import { AuditAction, AuditEntity, Prisma, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/services/audit";
import {
  paymentCreateSchema,
  paymentQuerySchema,
  paymentReverseSchema,
  type PaymentQuery,
} from "@/lib/validation/schemas";
import { badRequest, conflict, notFound } from "@/lib/utils/errors";
import { formatMoney, toMoneyString } from "@/lib/utils/currency";
import { parseDateFilter } from "@/lib/utils/dates";
import { TRANSACTION_NUMBER_PATTERN } from "@/lib/constants";
import { MAX_REPORT_ROWS } from "@/lib/services/tickets";
import type { Paginated, PaymentDTO } from "@/lib/services/types";

const paymentInclude = {
  user: { select: { id: true, name: true } },
  ticket: {
    include: { agent: { select: { id: true, name: true, code: true } } },
  },
} satisfies Prisma.PaymentInclude;

type PaymentRow = Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>;

function toPaymentDTO(row: PaymentRow): PaymentDTO {
  return {
    id: row.id,
    transactionNumber: row.transactionNumber,
    amount: toMoneyString(row.amount),
    currency: row.currency,
    paidAt: row.paidAt.toISOString(),
    paidBy: row.user,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    ticket: {
      id: row.ticket.id,
      pnr: row.ticket.pnr,
      amount: toMoneyString(row.ticket.amount),
      currency: row.ticket.currency,
      status: row.ticket.status,
      createdAt: row.ticket.createdAt.toISOString(),
      agent: row.ticket.agent,
    },
  };
}

function buildPaymentWhere(query: PaymentQuery): Prisma.PaymentWhereInput {
  const where: Prisma.PaymentWhereInput = {};

  if (query.agentId) where.ticket = { agentId: query.agentId };

  const from = parseDateFilter(query.from, "start");
  const to = parseDateFilter(query.to, "end");
  if (from || to) where.paidAt = { ...(from && { gte: from }), ...(to && { lte: to }) };

  const min = query.minAmount ? Number(query.minAmount.replace(/[\s,]/g, "")) : undefined;
  const max = query.maxAmount ? Number(query.maxAmount.replace(/[\s,]/g, "")) : undefined;
  if (Number.isFinite(min) || Number.isFinite(max)) {
    where.amount = {
      ...(Number.isFinite(min) && { gte: new Prisma.Decimal(min!) }),
      ...(Number.isFinite(max) && { lte: new Prisma.Decimal(max!) }),
    };
  }

  if (query.q) {
    where.OR = [
      { transactionNumber: { contains: query.q, mode: "insensitive" } },
      { ticket: { pnr: { contains: query.q, mode: "insensitive" } } },
      { ticket: { agent: { name: { contains: query.q, mode: "insensitive" } } } },
      { ticket: { agent: { code: { contains: query.q, mode: "insensitive" } } } },
    ];
  }

  return where;
}

function paymentOrderBy(query: PaymentQuery): Prisma.PaymentOrderByWithRelationInput {
  return { [query.sort]: query.dir };
}

export async function listPayments(
  rawQuery: Partial<PaymentQuery>,
): Promise<Paginated<PaymentDTO> & { totalAmount: string }> {
  const query = paymentQuerySchema.parse(rawQuery);
  const where = buildPaymentWhere(query);

  const [total, rows, sum] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      include: paymentInclude,
      orderBy: paymentOrderBy(query),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.payment.aggregate({ where, _sum: { amount: true } }),
  ]);

  return {
    items: rows.map(toPaymentDTO),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    totalAmount: toMoneyString(sum._sum.amount ?? 0),
  };
}

/** Unpaginated read for reports and exports — see the note in tickets.ts. */
export async function listPaymentsForReport(
  rawQuery: Partial<PaymentQuery>,
  limit = MAX_REPORT_ROWS,
): Promise<PaymentDTO[]> {
  const query = paymentQuerySchema.parse({ ...rawQuery, page: 1, pageSize: 1 });
  const rows = await prisma.payment.findMany({
    where: buildPaymentWhere(query),
    include: paymentInclude,
    orderBy: paymentOrderBy(query),
    take: Math.min(limit, MAX_REPORT_ROWS),
  });
  return rows.map(toPaymentDTO);
}

/** Count and value of the filtered payment set, computed by the database. */
export async function summarisePayments(rawQuery: Partial<PaymentQuery>) {
  const query = paymentQuerySchema.parse({ ...rawQuery, page: 1, pageSize: 1 });
  const result = await prisma.payment.aggregate({
    where: buildPaymentWhere(query),
    _count: { _all: true },
    _sum: { amount: true },
  });
  return {
    count: result._count._all,
    totalAmount: toMoneyString(result._sum.amount ?? 0),
  };
}

export async function getPayment(id: string): Promise<PaymentDTO> {
  const row = await prisma.payment.findUnique({ where: { id }, include: paymentInclude });
  if (!row) throw notFound("Payment not found.");
  return toPaymentDTO(row);
}

export async function getPaymentByTransactionNumber(transactionNumber: string) {
  const row = await prisma.payment.findUnique({
    where: { transactionNumber },
    include: paymentInclude,
  });
  return row ? toPaymentDTO(row) : null;
}

/**
 * Record a payment against a ticket.
 *
 * Everything below happens inside one database transaction: create the payment
 * row, flip the ticket to PAID, and write the audit entries. If any step fails
 * the whole thing rolls back, so a ticket can never end up PAID without a
 * matching payment record (or vice versa).
 *
 * The ticket row is locked with `SELECT ... FOR UPDATE` before the status is
 * checked, so two staff members clicking "Record Payment" at the same moment
 * cannot both get through — the second one waits and then sees PAID.
 */
export async function recordPayment(
  ticketId: string,
  input: unknown,
  actor: { id: string; ip?: string },
): Promise<PaymentDTO> {
  const data = paymentCreateSchema.parse(input);

  // Server-side re-check: never trust the client's format validation alone.
  if (!TRANSACTION_NUMBER_PATTERN.test(data.transactionNumber)) {
    throw badRequest("Transaction number must contain exactly 4 digits.", {
      transactionNumber: ["Transaction number must contain exactly 4 digits."],
    });
  }

  const paidAt = data.paidAt ?? new Date();
  if (paidAt.getTime() > Date.now() + 60_000) {
    throw badRequest("The payment date cannot be in the future.", {
      paidAt: ["The payment date cannot be in the future."],
    });
  }

  const payment = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<
      Array<{ id: string; status: TicketStatus; amount: Prisma.Decimal; currency: string }>
    >`SELECT id, status, amount, currency FROM tickets WHERE id = ${ticketId}::uuid FOR UPDATE`;

    const row = locked[0];
    if (!row) throw notFound("Ticket not found.");
    if (row.status === TicketStatus.PAID) {
      throw conflict("This ticket has already been paid.");
    }

    const ticketAmount = new Prisma.Decimal(row.amount);

    // Version 1 does not support partial payment: the amount is always the
    // full ticket amount. If the client sent one, it must match exactly.
    if (data.amount !== undefined) {
      const supplied = new Prisma.Decimal(data.amount.toFixed(2));
      if (!supplied.equals(ticketAmount)) {
        throw badRequest(
          `The payment must match the ticket amount of ${formatMoney(
            toMoneyString(ticketAmount),
            row.currency,
          )}. Partial payments are not supported.`,
          { amount: ["Payment amount must equal the ticket amount."] },
        );
      }
    }

    const clash = await tx.payment.findUnique({
      where: { transactionNumber: data.transactionNumber },
      select: { id: true, ticket: { select: { pnr: true } } },
    });
    if (clash) {
      throw conflict(
        `Transaction number ${data.transactionNumber} is already recorded against ticket ${clash.ticket.pnr}.`,
      );
    }

    const created = await tx.payment.create({
      data: {
        ticketId,
        transactionNumber: data.transactionNumber,
        amount: ticketAmount,
        currency: row.currency,
        notes: data.notes || null,
        paidBy: actor.id,
        paidAt,
      },
      include: paymentInclude,
    });

    await tx.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.PAID },
    });

    const snapshot = {
      pnr: created.ticket.pnr,
      agent: created.ticket.agent.name,
      agentCode: created.ticket.agent.code,
      amount: toMoneyString(created.amount),
      currency: created.currency,
      transactionNumber: created.transactionNumber,
      paidAt: created.paidAt.toISOString(),
    };

    await recordAudit(
      {
        userId: actor.id,
        action: AuditAction.CREATE_PAYMENT,
        entityType: AuditEntity.PAYMENT,
        entityId: created.id,
        summary: `Recorded payment ${created.transactionNumber} for ticket ${created.ticket.pnr} (${created.ticket.agent.name})`,
        newValues: snapshot,
        ipAddress: actor.ip,
      },
      tx,
    );

    await recordAudit(
      {
        userId: actor.id,
        action: AuditAction.MARK_TICKET_PAID,
        entityType: AuditEntity.TICKET,
        entityId: ticketId,
        summary: `Marked ${created.ticket.pnr} as PAID — transaction ${created.transactionNumber}`,
        oldValues: { status: TicketStatus.UNPAID, transactionNumber: null },
        newValues: {
          status: TicketStatus.PAID,
          transactionNumber: created.transactionNumber,
          amount: toMoneyString(created.amount),
          currency: created.currency,
        },
        ipAddress: actor.ip,
      },
      tx,
    );

    return created;
  });

  return toPaymentDTO(payment);
}

/**
 * Reverse a payment — ADMIN only, requires a written reason and an explicit
 * confirmation. The payment row is removed (which frees its ticket and its
 * transaction number for re-use) and the ticket returns to UNPAID; a full
 * snapshot of what was deleted is preserved in the audit log, so the reversal
 * is never silent and the original payment remains reconstructable.
 */
export async function reversePayment(
  paymentId: string,
  input: unknown,
  actor: { id: string; ip?: string },
) {
  const data = paymentReverseSchema.parse(input);

  const before = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: paymentInclude,
  });
  if (!before) throw notFound("Payment not found.");

  const snapshot = {
    paymentId: before.id,
    transactionNumber: before.transactionNumber,
    amount: toMoneyString(before.amount),
    currency: before.currency,
    paidAt: before.paidAt.toISOString(),
    paidBy: before.user?.name ?? null,
    pnr: before.ticket.pnr,
    agent: before.ticket.agent.name,
    agentCode: before.ticket.agent.code,
    ticketStatus: TicketStatus.PAID,
  };

  await prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id: paymentId } });
    await tx.ticket.update({
      where: { id: before.ticketId },
      data: { status: TicketStatus.UNPAID },
    });

    await recordAudit(
      {
        userId: actor.id,
        action: AuditAction.REVERSE_PAYMENT,
        entityType: AuditEntity.PAYMENT,
        entityId: paymentId,
        summary: `Reversed payment ${before.transactionNumber} on ticket ${before.ticket.pnr} — ${data.reason}`,
        oldValues: snapshot,
        newValues: { reason: data.reason, ticketStatus: TicketStatus.UNPAID },
        ipAddress: actor.ip,
      },
      tx,
    );

    await recordAudit(
      {
        userId: actor.id,
        action: AuditAction.UPDATE_TICKET,
        entityType: AuditEntity.TICKET,
        entityId: before.ticketId,
        summary: `Ticket ${before.ticket.pnr} returned to UNPAID after payment reversal`,
        oldValues: { status: TicketStatus.PAID, transactionNumber: before.transactionNumber },
        newValues: { status: TicketStatus.UNPAID, transactionNumber: null, reason: data.reason },
        ipAddress: actor.ip,
      },
      tx,
    );
  });

  return { ticketId: before.ticketId };
}
