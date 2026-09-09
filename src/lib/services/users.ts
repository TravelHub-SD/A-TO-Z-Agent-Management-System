import "server-only";
import { AuditAction, AuditEntity, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/services/audit";
import { hashPassword } from "@/lib/auth/password";
import {
  userCreateSchema,
  userUpdateSchema,
} from "@/lib/validation/schemas";
import { badRequest, conflict, notFound } from "@/lib/utils/errors";
import type { UserDTO } from "@/lib/services/types";

/**
 * Internal accounts. There is no public sign-up: an ADMIN provisions every
 * account here. Password hashes are never included in any DTO.
 */
type UserRow = Prisma.UserGetPayload<{
  include: { _count: { select: { ticketsCreated: true; paymentsTaken: true } } };
}>;

function toUserDTO(row: UserRow): UserDTO {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    ticketCount: row._count.ticketsCreated,
    paymentCount: row._count.paymentsTaken,
  };
}

export async function listUsers(): Promise<UserDTO[]> {
  const rows = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { _count: { select: { ticketsCreated: true, paymentsTaken: true } } },
  });
  return rows.map(toUserDTO);
}

export async function createUser(
  input: unknown,
  actor: { id: string; ip?: string },
): Promise<UserDTO> {
  const data = userCreateSchema.parse(input);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw conflict("That email address is already registered.");

  const passwordHash = await hashPassword(data.password);

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        isActive: data.isActive,
      },
      include: { _count: { select: { ticketsCreated: true, paymentsTaken: true } } },
    });

    await recordAudit(
      {
        userId: actor.id,
        action: AuditAction.USER_CREATED,
        entityType: AuditEntity.USER,
        entityId: user.id,
        summary: `Created ${user.role.toLowerCase()} account for ${user.name}`,
        newValues: {
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
        ipAddress: actor.ip,
      },
      tx,
    );

    return user;
  });

  return toUserDTO(created);
}

export async function updateUser(
  id: string,
  input: unknown,
  actor: { id: string; ip?: string },
): Promise<UserDTO> {
  const data = userUpdateSchema.parse(input);

  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) throw notFound("User not found.");

  // Guard rails so an administrator cannot lock everyone (or themselves) out.
  if (id === actor.id) {
    if (data.isActive === false) {
      throw badRequest("You cannot deactivate your own account.");
    }
    if (data.role && data.role !== before.role) {
      throw badRequest("You cannot change your own role.");
    }
  }

  if (
    before.role === Role.ADMIN &&
    (data.role === Role.STAFF || data.isActive === false)
  ) {
    const otherAdmins = await prisma.user.count({
      where: { role: Role.ADMIN, isActive: true, id: { not: id } },
    });
    if (otherAdmins === 0) {
      throw badRequest("At least one active administrator must remain.");
    }
  }

  const patch: Prisma.UserUpdateInput = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.role !== undefined) patch.role = data.role;
  if (data.isActive !== undefined) patch.isActive = data.isActive;
  if (data.password !== undefined) patch.passwordHash = await hashPassword(data.password);

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: patch,
      include: { _count: { select: { ticketsCreated: true, paymentsTaken: true } } },
    });

    await recordAudit(
      {
        userId: actor.id,
        action: AuditAction.USER_UPDATED,
        entityType: AuditEntity.USER,
        entityId: id,
        summary: data.password
          ? `Reset the password for ${user.name}`
          : `Updated account for ${user.name}`,
        oldValues: {
          name: before.name,
          role: before.role,
          isActive: before.isActive,
        },
        newValues: {
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          passwordChanged: Boolean(data.password),
        },
        ipAddress: actor.ip,
      },
      tx,
    );

    return user;
  });

  return toUserDTO(updated);
}

export async function getUserForAuth(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      passwordHash: true,
    },
  });
}

export async function touchLastLogin(id: string) {
  await prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
}
