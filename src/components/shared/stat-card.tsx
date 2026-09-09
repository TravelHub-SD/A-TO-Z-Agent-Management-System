import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatMoney, type MoneyString } from "@/lib/utils/currency";

/**
 * Headline figure with an optional caption and link-through. `tone` tints the
 * value using the same paid/unpaid language used everywhere else.
 */
export function StatCard({
  label,
  value,
  currency,
  caption,
  icon: Icon,
  tone = "neutral",
  href,
  className,
}: {
  label: string;
  value: MoneyString | number | string;
  currency?: string;
  caption?: React.ReactNode;
  icon?: React.ElementType;
  tone?: "paid" | "unpaid" | "neutral" | "brand";
  href?: string;
  className?: string;
}) {
  const display = currency ? formatMoney(value as MoneyString, currency) : String(value);

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-navy-500">
          {label}
        </p>
        {Icon && (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              tone === "paid" && "bg-paid-50 text-paid-600",
              tone === "unpaid" && "bg-unpaid-50 text-unpaid-600",
              tone === "brand" && "bg-brand-50 text-brand-600",
              tone === "neutral" && "bg-navy-100 text-navy-500",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        )}
      </div>
      <p
        className={cn(
          "tabular mt-2.5 text-[22px] font-semibold leading-tight tracking-tight",
          tone === "paid" && "text-paid-700",
          tone === "unpaid" && "text-unpaid-700",
          tone === "brand" && "text-brand-700",
          tone === "neutral" && "text-navy-900",
        )}
      >
        {display}
      </p>
      {caption && (
        <p className="mt-1.5 flex items-center gap-1 text-[12.5px] text-navy-500">
          {caption}
          {href && <ArrowUpRight className="size-3.5 text-navy-400" aria-hidden />}
        </p>
      )}
    </>
  );

  const shell = cn(
    "block rounded-[var(--radius-card)] border border-hairline bg-surface p-5 shadow-[var(--shadow-card)] transition-shadow",
    href && "hover:border-navy-200 hover:shadow-[var(--shadow-raised)]",
    className,
  );

  return href ? (
    <Link href={href} className={shell}>
      {body}
    </Link>
  ) : (
    <div className={shell}>{body}</div>
  );
}
