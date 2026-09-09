import "server-only";
import { AuditAction, AuditEntity, Prisma, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/services/audit";
import {
  agentCreateSchema,
  agentQuerySchema,
  agentUpdateSchema,
  type AgentQuery,
} from "@/lib/validation/schemas";
import { conflict, notFound } from "@/lib/utils/errors";
import { getSettings } from "@/lib/services/settings";
import type {
  AgentDTO,
  AgentWithTotals,
  Paginated,
} from "@/lib/services/types";

type AgentRow = Prisma.AgentGetPayload<object>;

function toAgentDTO(row: AgentRow): AgentDTO {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Empty (all-zero) totals for an agent with no tickets yet. */
function emptyTotals(currency: string) {
  return {
    ticketCount: 0,
    paidCount: 0,
    unpaidCount: 0,
    totalAmount: "0.00",
    paidAmount: "0.00",
    outstandingAmount: "0.00",
    currency,
  };
}

/**
 * Per-agent ticket totals computed by the database rather than in JS, so the
 * agents table stays a constant number of queries no matter how many agents
 * or tickets exist.
 */
async function totalsByAgent(agentIds: string[]) {
  if (agentIds.length === 0) {
    return new Map<string, ReturnType<typeof emptyTotals>>();
  }

  const grouped = await prisma.ticket.groupBy({
    by: ["agentId", "status"],
    where: { agentId: { in: agentIds } },
    _count: { _all: true },
    _sum: { amount: true },
  });

  const settings = await getSettings();
  const map = new Map<string, ReturnType<typeof emptyTotals>>();

  for (const id of agentIds) map.set(id, emptyTotals(settings.defaultCurrency));

  for (const group of grouped) {
    const entry = map.get(group.agentId);
    if (!entry) continue;
    const count = group._count._all;
    const sum = Number(group._sum.amount ?? 0);

    entry.ticketCount += count;
    entry.totalAmount = (Number(entry.totalAmount) + sum).toFixed(2);

    if (group.status === TicketStatus.PAID) {
      entry.paidCount += count;
      entry.paidAmount = (Number(entry.paidAmount) + sum).toFixed(2);
    } else {
      entry.unpaidCount += count;
      entry.outstandingAmount = (Number(entry.outstandingAmount) + sum).toFixed(2);
    }
  }

  return map;
}

export async function listAgents(
  rawQuery: Partial<AgentQuery>,
): Promise<Paginated<AgentWithTotals>> {
  const query = agentQuerySchema.parse(rawQuery);

  const where: Prisma.AgentWhereInput = {};
  if (query.status === "active") where.isActive = true;
  if (query.status === "inactive") where.isActive = false;
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { code: { contains: query.q, mode: "insensitive" } },
      { email: { contains: query.q, mode: "insensitive" } },
      { phone: { contains: query.q, mode: "insensitive" } },
    ];
  }

  // "outstanding" is a derived value, so that ordering is applied after the
  // totals are attached; the other sorts are pushed down to the database.
  const dbSortable = query.sort !== "outstanding";
  const orderBy: Prisma.AgentOrderByWithRelationInput = dbSortable
    ? { [query.sort]: query.dir }
    : { name: "asc" };

  const [total, rows] = await Promise.all([
    prisma.agent.count({ where }),
    prisma.agent.findMany({
      where,
      orderBy,
      ...(dbSortable
        ? { skip: (query.page - 1) * query.pageSize, take: query.pageSize }
        : {}),
    }),
  ]);

  const totals = await totalsByAgent(rows.map((r) => r.id));
  const settings = await getSettings();

  let items: AgentWithTotals[] = rows.map((row) => ({
    ...toAgentDTO(row),
    ...(totals.get(row.id) ?? emptyTotals(settings.defaultCurrency)),
  }));

  if (!dbSortable) {
    items.sort((a, b) => {
      const diff = Number(a.outstandingAmount) - Number(b.outstandingAmount);
      return query.dir === "asc" ? diff : -diff;
    });
    const start = (query.page - 1) * query.pageSize;
    items = items.slice(start, start + query.pageSize);
  }

  return {
    items,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

/** Lightweight list for select inputs — active agents only by default. */
export async function listAgentOptions(includeInactive = false) {
  const rows = await prisma.agent.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true, isActive: true },
  });
  return rows;
}

export async function getAgent(id: string): Promise<AgentDTO> {
  const row = await prisma.agent.findUnique({ where: { id } });
  if (!row) throw notFound("Agent not found.");
  return toAgentDTO(row);
}

export async function getAgentWithTotals(id: string): Promise<AgentWithTotals> {
  const agent = await getAgent(id);
  const totals = await totalsByAgent([id]);
  const settings = await getSettings();
  return { ...agent, ...(totals.get(id) ?? emptyTotals(settings.defaultCurrency)) };
}

export async function createAgent(
  input: unknown,
  actor: { id: string; ip?: string },
): Promise<AgentDTO> {
  const data = agentCreateSchema.parse(input);

  const existing = await prisma.agent.findUnique({ where: { code: data.code } });
  if (existing) throw conflict("That agent code is already in use.");

  const agent = await prisma.$transaction(async (tx) => {
    const created = await tx.agent.create({
      data: {
        name: data.name,
        code: data.code,
        phone: data.phone || null,
        email: data.email || null,
        notes: data.notes || null,
        isActive: data.isActive,
      },
    });

    await recordAudit(
      {
        userId: actor.id,
        action: AuditAction.CREATE_AGENT,
        entityType: AuditEntity.AGENT,
        entityId: created.id,
        summary: `Created agent ${created.name} (${created.code})`,
        newValues: {
          name: created.name,
          code: created.code,
          phone: created.phone,
          email: created.email,
          isActive: created.isActive,
        },
        ipAddress: actor.ip,
      },
      tx,
    );

    return created;
  });

  return toAgentDTO(agent);
}

export async function updateAgent(
  id: string,
  input: unknown,
  actor: { id: string; ip?: string },
): Promise<AgentDTO> {
  const data = agentUpdateSchema.parse(input);
  const before = await prisma.agent.findUnique({ where: { id } });
  if (!before) throw notFound("Agent not found.");

  if (data.code && data.code !== before.code) {
    const clash = await prisma.agent.findUnique({ where: { code: data.code } });
    if (clash) throw conflict("That agent code is already in use.");
  }

  const patch: Prisma.AgentUpdateInput = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.code !== undefined) patch.code = data.code;
  if (data.phone !== undefined) patch.phone = data.phone || null;
  if (data.email !== undefined) patch.email = data.email || null;
  if (data.notes !== undefined) patch.notes = data.notes || null;
  if (data.isActive !== undefined) patch.isActive = data.isActive;

  const agent = await prisma.$transaction(async (tx) => {
    const updated = await tx.agent.update({ where: { id }, data: patch });

    const statusChanged =
      data.isActive !== undefined && data.isActive !== before.isActive;

    await recordAudit(
      {
        userId: actor.id,
        action: AuditAction.UPDATE_AGENT,
        entityType: AuditEntity.AGENT,
        entityId: id,
        summary: statusChanged
          ? `${data.isActive ? "Activated" : "Deactivated"} agent ${updated.name} (${updated.code})`
          : `Updated agent ${updated.name} (${updated.code})`,
        oldValues: {
          name: before.name,
          code: before.code,
          phone: before.phone,
          email: before.email,
          notes: before.notes,
          isActive: before.isActive,
        },
        newValues: {
          name: updated.name,
          code: updated.code,
          phone: updated.phone,
          email: updated.email,
          notes: updated.notes,
          isActive: updated.isActive,
        },
        ipAddress: actor.ip,
      },
      tx,
    );

    return updated;
  });

  return toAgentDTO(agent);
}

export async function setAgentActive(
  id: string,
  isActive: boolean,
  actor: { id: string; ip?: string },
) {
  if (!isActive) {
    // Deactivating hides an agent from new-ticket selection; blocking it while
    // money is still owed keeps outstanding balances visible and chaseable.
    const unpaid = await prisma.ticket.count({
      where: { agentId: id, status: TicketStatus.UNPAID },
    });
    if (unpaid > 0) {
      throw conflict(
        `This agent still has ${unpaid} unpaid ticket${unpaid === 1 ? "" : "s"}. Settle or reassign them before deactivating.`,
      );
    }
  }
  return updateAgent(id, { isActive }, actor);
}

export { toAgentDTO };
