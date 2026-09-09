import { z } from "zod";
import { Role, TicketStatus } from "@prisma/client";
import {
  CURRENCY_CODES,
  DEFAULT_CURRENCY,
  PNR_PATTERN,
  SUPPORTED_TIMEZONES,
  TRANSACTION_NUMBER_PATTERN,
} from "@/lib/constants";

/**
 * These schemas are the single source of truth for validation. The API routes
 * run them server-side; the forms import the same rules so the client shows
 * the same messages before a request is ever made.
 */

const trimmed = (max: number) => z.string().trim().max(max);

export const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((v) => (CURRENCY_CODES as string[]).includes(v), {
    message: "Select a supported currency.",
  });

/**
 * Amounts arrive from forms as strings. Commas and spaces typed by staff are
 * stripped before parsing so "1,250,000" is accepted.
 */
export const amountSchema = z
  .union([z.string(), z.number()])
  .transform((value) =>
    typeof value === "number" ? value : Number(value.replace(/[\s,]/g, "")),
  )
  .refine((n) => Number.isFinite(n), { message: "Enter a valid amount." })
  .refine((n) => n > 0, { message: "Amount must be greater than zero." })
  .refine((n) => n <= 9_999_999_999_999, { message: "Amount is too large." })
  .refine((n) => Math.round(n * 100) === Number((n * 100).toFixed(0)), {
    message: "Amount can have at most 2 decimal places.",
  });

export const pnrSchema = z
  .string()
  .trim()
  .min(1, { message: "Please enter a PNR." })
  .toUpperCase()
  .refine((v) => PNR_PATTERN.test(v), {
    message: "PNR must be 5–8 letters or digits (e.g. ABC123).",
  });

export const transactionNumberSchema = z
  .string()
  .trim()
  .min(1, { message: "Please enter the transaction number." })
  .refine((v) => TRANSACTION_NUMBER_PATTERN.test(v), {
    message: "Transaction number must contain exactly 4 digits.",
  });

/* ------------------------------- auth ---------------------------------- */

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Please enter your email address." })
    .email({ message: "Enter a valid email address." })
    .toLowerCase(),
  password: z.string().min(1, { message: "Please enter your password." }),
});
export type LoginInput = z.infer<typeof loginSchema>;

/* ------------------------------ agents --------------------------------- */

export const agentCreateSchema = z.object({
  name: trimmed(160).min(2, { message: "Agent name is required." }),
  code: trimmed(40)
    .min(2, { message: "Agent code is required." })
    .toUpperCase()
    .refine((v) => /^[A-Z0-9][A-Z0-9-]*$/.test(v), {
      message: "Agent code may contain letters, digits and hyphens only.",
    }),
  phone: trimmed(40).optional().or(z.literal("")),
  email: z
    .union([z.string().trim().email({ message: "Enter a valid email address." }), z.literal("")])
    .optional(),
  notes: trimmed(2000).optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
});
export type AgentCreateInput = z.infer<typeof agentCreateSchema>;

export const agentUpdateSchema = agentCreateSchema.partial();
export type AgentUpdateInput = z.infer<typeof agentUpdateSchema>;

/* ------------------------------ tickets -------------------------------- */

export const ticketCreateSchema = z.object({
  agentId: z.string().uuid({ message: "Select an agent." }),
  pnr: pnrSchema,
  amount: amountSchema,
  currency: currencySchema.default(DEFAULT_CURRENCY),
  notes: trimmed(2000).optional().or(z.literal("")),
});
export type TicketCreateInput = z.infer<typeof ticketCreateSchema>;

/** Only unpaid tickets can be edited, and never their status directly. */
export const ticketUpdateSchema = z.object({
  agentId: z.string().uuid({ message: "Select an agent." }).optional(),
  pnr: pnrSchema.optional(),
  amount: amountSchema.optional(),
  currency: currencySchema.optional(),
  notes: trimmed(2000).optional().or(z.literal("")),
});
export type TicketUpdateInput = z.infer<typeof ticketUpdateSchema>;

/* ------------------------------ payments ------------------------------- */

export const paymentCreateSchema = z.object({
  transactionNumber: transactionNumberSchema,
  /** Optional: when supplied it must equal the ticket amount (v1 rule). */
  amount: amountSchema.optional(),
  paidAt: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined))
    .refine((d) => d === undefined || !Number.isNaN(d.getTime()), {
      message: "Enter a valid payment date.",
    }),
  notes: trimmed(1000).optional().or(z.literal("")),
});
export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;

export const paymentReverseSchema = z.object({
  reason: trimmed(500).min(10, {
    message: "Give a reason of at least 10 characters for the reversal.",
  }),
  confirm: z.literal(true, {
    errorMap: () => ({ message: "You must confirm the reversal." }),
  }),
});
export type PaymentReverseInput = z.infer<typeof paymentReverseSchema>;

/* -------------------------------- users -------------------------------- */

export const passwordSchema = z
  .string()
  .min(10, { message: "Password must be at least 10 characters." })
  .max(100, { message: "Password must be 100 characters or fewer." })
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v), {
    message: "Password must include an uppercase letter, a lowercase letter and a digit.",
  });

export const userCreateSchema = z.object({
  name: trimmed(120).min(2, { message: "Name is required." }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: "Enter a valid email address." }),
  password: passwordSchema,
  role: z.nativeEnum(Role).default(Role.STAFF),
  isActive: z.coerce.boolean().default(true),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = z.object({
  name: trimmed(120).min(2, { message: "Name is required." }).optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.coerce.boolean().optional(),
  password: passwordSchema.optional(),
});
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: "Enter your current password." }),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, { message: "Confirm your new password." }),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

/* ------------------------------ settings ------------------------------- */

export const settingsUpdateSchema = z.object({
  agencyName: trimmed(160).min(2, { message: "Agency name is required." }),
  defaultCurrency: currencySchema,
  timezone: z
    .string()
    .trim()
    .refine((v) => SUPPORTED_TIMEZONES.includes(v), {
      message: "Select a supported timezone.",
    }),
  outstandingWarnDays: z.coerce
    .number()
    .int()
    .min(1, { message: "Must be at least 1 day." })
    .max(365, { message: "Must be 365 days or fewer." }),
  outstandingCriticalDays: z.coerce
    .number()
    .int()
    .min(1, { message: "Must be at least 1 day." })
    .max(365, { message: "Must be 365 days or fewer." }),
});
export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;

/* ------------------------------- queries ------------------------------- */

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
});

export const ticketQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  agentId: z.string().uuid().optional().or(z.literal("")),
  status: z.nativeEnum(TicketStatus).optional().or(z.literal("")),
  from: z.string().trim().optional().or(z.literal("")),
  to: z.string().trim().optional().or(z.literal("")),
  sort: z
    .enum(["createdAt", "amount", "pnr", "status", "paidAt"])
    .default("createdAt"),
  dir: z.enum(["asc", "desc"]).default("desc"),
});
export type TicketQuery = z.infer<typeof ticketQuerySchema>;

export const paymentQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  agentId: z.string().uuid().optional().or(z.literal("")),
  from: z.string().trim().optional().or(z.literal("")),
  to: z.string().trim().optional().or(z.literal("")),
  minAmount: z.string().trim().optional().or(z.literal("")),
  maxAmount: z.string().trim().optional().or(z.literal("")),
  sort: z.enum(["paidAt", "amount", "transactionNumber"]).default("paidAt"),
  dir: z.enum(["asc", "desc"]).default("desc"),
});
export type PaymentQuery = z.infer<typeof paymentQuerySchema>;

export const agentQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  sort: z.enum(["name", "code", "outstanding", "createdAt"]).default("name"),
  dir: z.enum(["asc", "desc"]).default("asc"),
});
export type AgentQuery = z.infer<typeof agentQuerySchema>;

export const auditQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(120).optional(),
  action: z.string().trim().optional().or(z.literal("")),
  entityType: z.string().trim().optional().or(z.literal("")),
  userId: z.string().uuid().optional().or(z.literal("")),
  from: z.string().trim().optional().or(z.literal("")),
  to: z.string().trim().optional().or(z.literal("")),
});
export type AuditQuery = z.infer<typeof auditQuerySchema>;

export const reportQuerySchema = z.object({
  type: z.enum(["agent", "payment", "outstanding", "ticket"]),
  agentId: z.string().uuid().optional().or(z.literal("")),
  status: z.nativeEnum(TicketStatus).optional().or(z.literal("")),
  from: z.string().trim().optional().or(z.literal("")),
  to: z.string().trim().optional().or(z.literal("")),
});
export type ReportQuery = z.infer<typeof reportQuerySchema>;

export const statementQuerySchema = z.object({
  from: z.string().trim().optional().or(z.literal("")),
  to: z.string().trim().optional().or(z.literal("")),
});
