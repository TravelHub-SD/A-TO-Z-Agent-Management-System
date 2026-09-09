import "server-only";
import { cache } from "react";
import { AuditAction, AuditEntity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/lib/services/audit";
import { settingsUpdateSchema } from "@/lib/validation/schemas";
import { badRequest } from "@/lib/utils/errors";
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from "@/lib/constants";
import type { SettingsDTO } from "@/lib/services/types";

const SETTINGS_ID = "global";

/**
 * Agency-wide configuration lives in a single pinned row. It is read on almost
 * every page (currency + timezone), so it is request-cached.
 */
export const getSettings = cache(async (): Promise<SettingsDTO> => {
  const row = await prisma.systemSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
  });

  return {
    agencyName: row.agencyName,
    defaultCurrency: row.defaultCurrency,
    timezone: row.timezone,
    outstandingWarnDays: row.outstandingWarnDays,
    outstandingCriticalDays: row.outstandingCriticalDays,
    updatedAt: row.updatedAt.toISOString(),
  };
});

/** Safe fallback for contexts where a database read is not desirable. */
export const FALLBACK_SETTINGS: SettingsDTO = {
  agencyName: "A TO Z Travel",
  defaultCurrency: DEFAULT_CURRENCY,
  timezone: DEFAULT_TIMEZONE,
  outstandingWarnDays: 14,
  outstandingCriticalDays: 30,
  updatedAt: new Date(0).toISOString(),
};

export async function updateSettings(
  input: unknown,
  actor: { id: string; ip?: string },
): Promise<SettingsDTO> {
  const data = settingsUpdateSchema.parse(input);

  if (data.outstandingCriticalDays <= data.outstandingWarnDays) {
    throw badRequest("The critical threshold must be greater than the warning threshold.", {
      outstandingCriticalDays: [
        "The critical threshold must be greater than the warning threshold.",
      ],
    });
  }

  const before = await getSettings();

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.systemSettings.upsert({
      where: { id: SETTINGS_ID },
      update: data,
      create: { id: SETTINGS_ID, ...data },
    });

    await recordAudit(
      {
        userId: actor.id,
        action: AuditAction.UPDATE_SETTINGS,
        entityType: AuditEntity.SETTINGS,
        entityId: null,
        summary: "Updated system settings",
        oldValues: {
          agencyName: before.agencyName,
          defaultCurrency: before.defaultCurrency,
          timezone: before.timezone,
          outstandingWarnDays: before.outstandingWarnDays,
          outstandingCriticalDays: before.outstandingCriticalDays,
        },
        newValues: data,
        ipAddress: actor.ip,
      },
      tx,
    );

    return updated;
  });

  return {
    agencyName: row.agencyName,
    defaultCurrency: row.defaultCurrency,
    timezone: row.timezone,
    outstandingWarnDays: row.outstandingWarnDays,
    outstandingCriticalDays: row.outstandingCriticalDays,
    updatedAt: row.updatedAt.toISOString(),
  };
}
