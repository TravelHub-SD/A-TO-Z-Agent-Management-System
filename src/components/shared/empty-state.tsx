import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Every list has one of these. An empty table is a dead end unless it says
 * what would fill it and offers the action that does so.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        compact ? "py-10" : "py-16",
        className,
      )}
    >
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-navy-100">
        <Icon className="size-5 text-navy-400" aria-hidden />
      </div>
      <p className="text-[14.5px] font-semibold text-navy-800">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-navy-500">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
