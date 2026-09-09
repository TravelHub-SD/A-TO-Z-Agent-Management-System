import { cn } from "@/lib/utils/cn";
import { formatMoney, type MoneyString } from "@/lib/utils/currency";

/**
 * Money is colour-coded consistently across the whole application:
 * green for settled amounts, red for amounts still owed, navy for neutral
 * totals. `tone` is derived from ticket status by the caller.
 */
export function Money({
  amount,
  currency,
  tone = "neutral",
  className,
  size = "md",
  withCurrency = true,
}: {
  amount: MoneyString | number | null | undefined;
  currency: string;
  tone?: "paid" | "unpaid" | "neutral" | "muted";
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  withCurrency?: boolean;
}) {
  return (
    <span
      className={cn(
        "tabular whitespace-nowrap font-semibold",
        tone === "paid" && "text-paid-700",
        tone === "unpaid" && "text-unpaid-700",
        tone === "neutral" && "text-navy-900",
        tone === "muted" && "font-medium text-navy-500",
        size === "sm" && "text-[12.5px]",
        size === "md" && "text-[13.5px]",
        size === "lg" && "text-lg",
        size === "xl" && "text-2xl tracking-tight",
        className,
      )}
    >
      {formatMoney(amount, currency, { withCurrency })}
    </span>
  );
}
