import { DEFAULT_CURRENCY } from "@/lib/constants";

/**
 * Amounts cross the server/client boundary as decimal strings so that no
 * precision is lost in JSON. Formatting parses to a Number only at the point
 * of display, which is safe well beyond any realistic ticket value.
 */
export type MoneyString = string;

export function toMoneyString(value: unknown): MoneyString {
  if (value === null || value === undefined) return "0.00";
  // Prisma Decimal, number and string all expose a usable toString().
  const raw = typeof value === "object" ? String(value) : String(value);
  const n = Number(raw);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

export function moneyToNumber(value: MoneyString | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function addMoney(a: MoneyString, b: MoneyString): MoneyString {
  return (moneyToNumber(a) + moneyToNumber(b)).toFixed(2);
}

export function subtractMoney(a: MoneyString, b: MoneyString): MoneyString {
  return (moneyToNumber(a) - moneyToNumber(b)).toFixed(2);
}

/**
 * `1250000` → `1,250,000 SDG`. Fractional minor units are only shown when the
 * amount actually has them, which keeps whole-pound tables readable.
 */
export function formatMoney(
  value: MoneyString | number | null | undefined,
  currency: string = DEFAULT_CURRENCY,
  options: { withCurrency?: boolean; forceDecimals?: boolean } = {},
) {
  const { withCurrency = true, forceDecimals = false } = options;
  const amount = moneyToNumber(value ?? 0);
  const hasFraction = forceDecimals || Math.abs(amount % 1) > 0.0001;

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return withCurrency ? `${formatted} ${currency}` : formatted;
}

/** Compact form for dense chart axes: 18,500,000 → 18.5M */
export function formatMoneyCompact(
  value: MoneyString | number | null | undefined,
) {
  const amount = moneyToNumber(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}
