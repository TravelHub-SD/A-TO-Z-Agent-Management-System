import { AuditAction } from "@prisma/client";
import {
  BadgeCheck,
  FilePlus2,
  LogIn,
  LogOut,
  Pencil,
  Settings,
  ShieldAlert,
  Trash2,
  Undo2,
  UserPlus,
  Wallet,
} from "lucide-react";
import type { AuditLogDTO } from "@/lib/services/types";
import { formatDateTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

const ACTION_META: Record<
  AuditAction,
  { icon: React.ElementType; label: string; tone: "paid" | "unpaid" | "warn" | "neutral" | "brand" }
> = {
  LOGIN: { icon: LogIn, label: "Signed in", tone: "neutral" },
  LOGOUT: { icon: LogOut, label: "Signed out", tone: "neutral" },
  LOGIN_FAILED: { icon: ShieldAlert, label: "Failed sign-in", tone: "warn" },
  USER_CREATED: { icon: UserPlus, label: "User created", tone: "brand" },
  USER_UPDATED: { icon: Pencil, label: "User updated", tone: "brand" },
  CREATE_AGENT: { icon: UserPlus, label: "Agent created", tone: "brand" },
  UPDATE_AGENT: { icon: Pencil, label: "Agent updated", tone: "neutral" },
  CREATE_TICKET: { icon: FilePlus2, label: "Ticket created", tone: "brand" },
  UPDATE_TICKET: { icon: Pencil, label: "Ticket updated", tone: "neutral" },
  DELETE_TICKET: { icon: Trash2, label: "Ticket deleted", tone: "unpaid" },
  MARK_TICKET_PAID: { icon: BadgeCheck, label: "Marked paid", tone: "paid" },
  CREATE_PAYMENT: { icon: Wallet, label: "Payment recorded", tone: "paid" },
  UPDATE_PAYMENT: { icon: Pencil, label: "Payment updated", tone: "warn" },
  REVERSE_PAYMENT: { icon: Undo2, label: "Payment reversed", tone: "unpaid" },
  UPDATE_SETTINGS: { icon: Settings, label: "Settings updated", tone: "neutral" },
};

export function actionMeta(action: AuditAction) {
  return ACTION_META[action] ?? { icon: Pencil, label: action, tone: "neutral" as const };
}

const TONE_CLASSES = {
  paid: "bg-paid-50 text-paid-600",
  unpaid: "bg-unpaid-50 text-unpaid-600",
  warn: "bg-warn-50 text-warn-600",
  brand: "bg-brand-50 text-brand-600",
  neutral: "bg-navy-100 text-navy-500",
} as const;

/** Compact audit list used on ticket and payment detail pages. */
export function AuditTimeline({
  entries,
  timezone,
  className,
}: {
  entries: AuditLogDTO[];
  timezone: string;
  className?: string;
}) {
  return (
    <ol className={cn("relative space-y-0", className)}>
      {entries.map((entry, index) => {
        const meta = actionMeta(entry.action);
        const Icon = meta.icon;
        const last = index === entries.length - 1;

        return (
          <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && (
              <span
                aria-hidden
                className="absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-px bg-hairline"
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full",
                TONE_CLASSES[meta.tone],
              )}
            >
              <Icon className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] font-medium leading-snug text-navy-900">
                {entry.summary}
              </p>
              <p className="mt-0.5 text-[11.5px] text-navy-400">
                {entry.user?.name ?? "System"} ·{" "}
                {formatDateTime(entry.createdAt, timezone)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
