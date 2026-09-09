import "server-only";
import { Prisma } from "@prisma/client";
import type { AuditAction, AuditEntity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditQuerySchema, type AuditQuery } from "@/lib/validation/schemas";
import { parseDateFilter } from "@/lib/utils/dates";
import type { AuditLogDTO, Paginated } from "@/lib/services/types";

/**
 * Append-only audit trail. Writes accept an optional transaction client so a
 * log entry can be committed atomically with the change it describes.
 */
export type AuditInput = {
  userId: string | null;
  action: AuditAction;
  entityType: AuditEntity;
  entityId?: string | null;
  summary: string;
  oldValues?: Prisma.InputJsonValue | null;
  newValues?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
};

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function recordAudit(input: AuditInput, client: DbClient = prisma) {
  return client.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary.slice(0, 400),
      oldValues: input.oldValues ?? Prisma.DbNull,
      newValues: input.newValues ?? Prisma.DbNull,
      ipAddress: input.ipAddress ?? null,
    },
  });
}

/**
 * Auditing must never break the operation it observes — a failed log write is
 * reported to the server logs instead of bubbling up. Only used for writes
 * outside a transaction (login, logout); in-transaction audit writes are
 * intentionally allowed to roll the whole change back.
 */
export async function recordAuditSafe(input: AuditInput) {
  try {
    await recordAudit(input);
  } catch (error) {
    console.error("[audit] failed to write audit log", error);
  }
}

function toJsonRecord(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export async function listAuditLogs(
  rawQuery: Partial<AuditQuery>,
): Promise<Paginated<AuditLogDTO>> {
  const query = auditQuerySchema.parse(rawQuery);
  const where: Prisma.AuditLogWhereInput = {};

  if (query.action) where.action = query.action as AuditAction;
  if (query.entityType) where.entityType = query.entityType as AuditEntity;
  if (query.userId) where.userId = query.userId;

  const from = parseDateFilter(query.from, "start");
  const to = parseDateFilter(query.to, "end");
  if (from || to) where.createdAt = { ...(from && { gte: from }), ...(to && { lte: to }) };

  if (query.q) {
    where.OR = [
      { summary: { contains: query.q, mode: "insensitive" } },
      { user: { name: { contains: query.q, mode: "insensitive" } } },
      { user: { email: { contains: query.q, mode: "insensitive" } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      summary: row.summary,
      oldValues: toJsonRecord(row.oldValues),
      newValues: toJsonRecord(row.newValues),
      ipAddress: row.ipAddress,
      createdAt: row.createdAt.toISOString(),
      user: row.user,
    })),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

/** Audit entries attached to one entity, newest first — used on detail pages. */
export async function listAuditForEntity(
  entityType: AuditEntity,
  entityId: string,
  limit = 25,
): Promise<AuditLogDTO[]> {
  const rows = await prisma.auditLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
  });

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    summary: row.summary,
    oldValues: toJsonRecord(row.oldValues),
    newValues: toJsonRecord(row.newValues),
    ipAddress: row.ipAddress,
    createdAt: row.createdAt.toISOString(),
    user: row.user,
  }));
}
