import * as React from "react";
import { cn } from "@/lib/utils/cn";

/** Label/value pair used on detail panels and confirmation dialogs. */
export function SummaryRow({
  label,
  children,
  className,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2",
        className,
      )}
    >
      <dt className="text-[12.5px] font-medium text-navy-500">{label}</dt>
      <dd
        className={cn(
          "text-[13.5px] font-medium text-navy-900",
          mono && "font-mono tabular tracking-tight",
        )}
      >
        {children}
      </dd>
    </div>
  );
}

export function SummaryList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <dl className={cn("divide-y divide-hairline", className)}>{children}</dl>;
}
