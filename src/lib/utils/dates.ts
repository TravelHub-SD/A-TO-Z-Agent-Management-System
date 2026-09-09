import { DEFAULT_TIMEZONE } from "@/lib/constants";

/**
 * All timestamps are stored in UTC (`timestamptz`) and rendered in the agency
 * timezone. Formatting always goes through Intl with an explicit `timeZone`
 * so the server and the browser render identical strings — otherwise
 * hydration would mismatch for any user outside the agency's zone.
 */

export type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(value: DateInput, timezone = DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  }).format(toDate(value));
}

export function formatDateShort(value: DateInput, timezone = DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: timezone,
  }).format(toDate(value));
}

export function formatDateTime(value: DateInput, timezone = DEFAULT_TIMEZONE) {
  const d = toDate(value);
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  }).format(d);
  return `${date} — ${time}`;
}

export function formatTime(value: DateInput, timezone = DEFAULT_TIMEZONE) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  }).format(toDate(value));
}

/** `2026-09-09`, suitable for `<input type="date">` and export filenames. */
export function toISODate(value: DateInput, timezone = DEFAULT_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  }).format(toDate(value));
  return parts;
}

/** Whole days between a ticket's creation and now — "days outstanding". */
export function daysBetween(from: DateInput, to: DateInput = new Date()) {
  const ms = toDate(to).getTime() - toDate(from).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/**
 * Turns a `YYYY-MM-DD` filter value into an inclusive UTC range boundary.
 * `end` is pushed to the last millisecond of the day so a single-day filter
 * captures the whole day rather than only midnight.
 */
export function parseDateFilter(
  value: string | null | undefined,
  boundary: "start" | "end",
): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const [, y, m, d] = match;
  const date = new Date(
    Date.UTC(
      Number(y),
      Number(m) - 1,
      Number(d),
      boundary === "start" ? 0 : 23,
      boundary === "start" ? 0 : 59,
      boundary === "start" ? 0 : 59,
      boundary === "start" ? 0 : 999,
    ),
  );
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** First and last day of the month containing `ref`, as ISO date strings. */
export function currentMonthRange(ref: Date = new Date()) {
  const start = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 1));
  const end = new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 0),
  );
  return { from: toISODate(start, "UTC"), to: toISODate(end, "UTC") };
}
