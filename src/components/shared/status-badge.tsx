import { TicketStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

/** 🔴 UNPAID / 🟢 PAID — the same everywhere the status appears. */
export function StatusBadge({
  status,
  className,
  size = "md",
}: {
  status: TicketStatus;
  className?: string;
  size?: "sm" | "md";
}) {
  const paid = status === TicketStatus.PAID;
  return (
    <Badge variant={paid ? "paid" : "unpaid"} size={size} className={className}>
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          paid ? "bg-paid-600" : "bg-unpaid-600",
        )}
      />
      {paid ? "Paid" : "Unpaid"}
    </Badge>
  );
}

export function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? "paid" : "neutral"} size="sm">
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", isActive ? "bg-paid-600" : "bg-navy-400")}
      />
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}

/**
 * Ages an unpaid ticket: neutral while fresh, amber past the warning
 * threshold, red past the critical one.
 */
export function AgeBadge({
  days,
  warnDays,
  criticalDays,
}: {
  days: number;
  warnDays: number;
  criticalDays: number;
}) {
  const variant = days >= criticalDays ? "unpaid" : days >= warnDays ? "warn" : "neutral";
  return (
    <Badge variant={variant} size="sm" className="tabular">
      {days} {days === 1 ? "day" : "days"}
    </Badge>
  );
}
