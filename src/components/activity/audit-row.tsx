"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Role } from "@prisma/client";
import type { AuditLogDTO } from "@/lib/services/types";
import { Badge } from "@/components/ui/badge";
import { TD, TR } from "@/components/ui/table";
import { actionMeta } from "@/components/activity/audit-timeline";
import { formatDateTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

const TONE_TO_BADGE = {
  paid: "paid",
  unpaid: "unpaid",
  warn: "warn",
  brand: "brand",
  neutral: "neutral",
} as const;

/**
 * One audit entry. Entries that carry before/after snapshots can be expanded
 * to show exactly which fields changed — the record of what a value used to be
 * is the point of the log.
 */
export function AuditRow({
  entry,
  timezone,
}: {
  entry: AuditLogDTO;
  timezone: string;
}) {
  const [open, setOpen] = React.useState(false);
  const meta = actionMeta(entry.action);
  const Icon = meta.icon;
  const hasDetail = Boolean(entry.oldValues || entry.newValues);

  return (
    <>
      <TR className={cn(hasDetail && "cursor-pointer")}>
        <TD className="whitespace-nowrap text-navy-600">
          {formatDateTime(entry.createdAt, timezone)}
        </TD>
        <TD>
          <span className="flex items-center gap-2">
            <Icon className="size-3.5 shrink-0 text-navy-400" aria-hidden />
            <Badge variant={TONE_TO_BADGE[meta.tone]} size="sm">
              {meta.label}
            </Badge>
          </span>
        </TD>
        <TD>
          <span className="block max-w-[32rem] text-navy-800">{entry.summary}</span>
        </TD>
        <TD>
          {entry.user ? (
            <>
              <span className="block max-w-[10rem] truncate font-medium">
                {entry.user.name}
              </span>
              <span className="block text-[11.5px] text-navy-400">
                {entry.user.role === Role.ADMIN ? "Administrator" : "Staff"}
              </span>
            </>
          ) : (
            <span className="text-navy-400">System</span>
          )}
        </TD>
        <TD align="right">
          {hasDetail ? (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[12.5px] font-medium text-brand-600 transition-colors hover:bg-brand-50"
            >
              {open ? "Hide" : "Details"}
              <ChevronDown
                className={cn("size-3.5 transition-transform", open && "rotate-180")}
                aria-hidden
              />
            </button>
          ) : (
            <span className="text-navy-300">—</span>
          )}
        </TD>
      </TR>

      {open && hasDetail && (
        <TR className="hover:bg-transparent">
          <TD colSpan={5} className="bg-navy-50/60 p-0">
            <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
              <ValuePanel title="Before" values={entry.oldValues} tone="unpaid" />
              <ValuePanel title="After" values={entry.newValues} tone="paid" />
            </div>
          </TD>
        </TR>
      )}
    </>
  );
}

function ValuePanel({
  title,
  values,
  tone,
}: {
  title: string;
  values: Record<string, unknown> | null;
  tone: "paid" | "unpaid";
}) {
  return (
    <div>
      <p
        className={cn(
          "mb-1.5 text-[11px] font-semibold uppercase tracking-wider",
          tone === "paid" ? "text-paid-700" : "text-unpaid-700",
        )}
      >
        {title}
      </p>
      {values ? (
        <dl className="divide-y divide-hairline rounded-lg border border-hairline bg-white px-3">
          {Object.entries(values).map(([key, value]) => (
            <div key={key} className="flex flex-wrap justify-between gap-2 py-1.5">
              <dt className="text-[12px] text-navy-500">{humanise(key)}</dt>
              <dd className="text-[12.5px] font-medium text-navy-800">
                {renderValue(value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="rounded-lg border border-dashed border-hairline px-3 py-3 text-[12.5px] text-navy-400">
          Not recorded
        </p>
      )}
    </div>
  );
}

function humanise(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function renderValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
