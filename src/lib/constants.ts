/** Currencies the system can record against a ticket or payment. */
export const SUPPORTED_CURRENCIES = [
  { code: "SDG", label: "Sudanese Pound", symbol: "SDG" },
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "AED", label: "UAE Dirham", symbol: "AED" },
  { code: "SAR", label: "Saudi Riyal", symbol: "SAR" },
  { code: "EGP", label: "Egyptian Pound", symbol: "EGP" },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

export const CURRENCY_CODES = SUPPORTED_CURRENCIES.map((c) => c.code);

export const DEFAULT_CURRENCY: CurrencyCode = "SDG";
export const DEFAULT_TIMEZONE = "Africa/Khartoum";

/** Timezones offered in Settings. Kept short and relevant to the agency. */
export const SUPPORTED_TIMEZONES = [
  "Africa/Khartoum",
  "Africa/Cairo",
  "Africa/Nairobi",
  "Asia/Riyadh",
  "Asia/Dubai",
  "Europe/Istanbul",
  "Europe/London",
  "UTC",
];

/** A transaction number is exactly four digits, e.g. 4827. */
export const TRANSACTION_NUMBER_LENGTH = 4;
export const TRANSACTION_NUMBER_PATTERN = /^\d{4}$/;

/** PNRs are 5–8 alphanumeric characters, stored upper-case. */
export const PNR_PATTERN = /^[A-Z0-9]{5,8}$/;

export const SESSION_COOKIE_NAME = "atoz_session";

export const PAGE_SIZES = [10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE = 25;
