import { Role } from "@prisma/client";

/**
 * Capability matrix. ADMIN has everything; STAFF gets the day-to-day
 * operations (creating agents and tickets, recording payments, reading
 * reports) but not account management, agent deactivation, deletions,
 * payment reversal or system settings.
 */
export const PERMISSIONS = {
  "agent:view": [Role.ADMIN, Role.STAFF],
  "agent:create": [Role.ADMIN, Role.STAFF],
  "agent:update": [Role.ADMIN, Role.STAFF],
  "agent:toggle-active": [Role.ADMIN],

  "ticket:view": [Role.ADMIN, Role.STAFF],
  "ticket:create": [Role.ADMIN, Role.STAFF],
  "ticket:update": [Role.ADMIN, Role.STAFF],
  "ticket:delete": [Role.ADMIN],

  "payment:view": [Role.ADMIN, Role.STAFF],
  "payment:create": [Role.ADMIN, Role.STAFF],
  "payment:reverse": [Role.ADMIN],

  "report:view": [Role.ADMIN, Role.STAFF],
  "report:export": [Role.ADMIN, Role.STAFF],

  "audit:view": [Role.ADMIN, Role.STAFF],

  "user:manage": [Role.ADMIN],
  "settings:manage": [Role.ADMIN],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | undefined | null, permission: Permission) {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export const isAdmin = (role: Role | undefined | null) => role === Role.ADMIN;
