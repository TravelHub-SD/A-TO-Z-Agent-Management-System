"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart3, CircleDollarSign, Ticket, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangeFilter, FilterSelect } from "@/components/shared/filter-bar";
import { cn } from "@/lib/utils/cn";

const REPORT_TYPES = [
  { value: "agent", label: "Agent Report", icon: Users, hint: "Activity for a selected agent" },
  { value: "payment", label: "Payment Report", icon: CircleDollarSign, hint: "Payments in a period" },
  { value: "outstanding", label: "Outstanding Report", icon: BarChart3, hint: "All unpaid tickets" },
  { value: "ticket", label: "Ticket Report", icon: Ticket, hint: "All tickets in a period" },
] as const;

export function ReportTypeTabs({ active }: { active: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const hrefFor = (type: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", type);
    // The status filter only means something for ticket-shaped reports.
    if (type === "payment" || type === "outstanding") params.delete("status");
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {REPORT_TYPES.map((report) => {
        const Icon = report.icon;
        const isActive = active === report.value;
        return (
          <Link
            key={report.value}
            href={hrefFor(report.value)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-start gap-3 rounded-[var(--radius-card)] border p-4 transition-all",
              isActive
                ? "border-brand-300 bg-brand-50 shadow-[var(--shadow-card)]"
                : "border-hairline bg-surface shadow-[var(--shadow-card)] hover:border-navy-200 hover:shadow-[var(--shadow-raised)]",
            )}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                isActive ? "bg-brand-600 text-white" : "bg-navy-100 text-navy-500",
              )}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-[13.5px] font-semibold",
                  isActive ? "text-brand-800" : "text-navy-900",
                )}
              >
                {report.label}
              </span>
              <span className="mt-0.5 block text-[12px] leading-snug text-navy-500">
                {report.hint}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function ReportControls({
  agents,
  showStatus,
}: {
  agents: Array<{ id: string; name: string; code: string }>;
  showStatus: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const reset = () => {
    const type = searchParams.get("type") ?? "ticket";
    router.push(`${pathname}?type=${type}`, { scroll: false });
  };

  const hasFilters = ["agentId", "status", "from", "to"].some((key) =>
    searchParams.get(key),
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect
        paramKey="agentId"
        label="Agent"
        allLabel="All agents"
        options={agents.map((agent) => ({
          value: agent.id,
          label: `${agent.name} (${agent.code})`,
        }))}
      />
      {showStatus && (
        <FilterSelect
          paramKey="status"
          label="Status"
          allLabel="All statuses"
          options={[
            { value: "UNPAID", label: "Unpaid" },
            { value: "PAID", label: "Paid" },
          ]}
        />
      )}
      <DateRangeFilter />
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={reset}>
          Reset
        </Button>
      )}
    </div>
  );
}
