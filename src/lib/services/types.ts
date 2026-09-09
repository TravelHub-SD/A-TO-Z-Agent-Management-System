import type {
  AuditAction,
  AuditEntity,
  Role,
  TicketStatus,
} from "@prisma/client";
import type { MoneyString } from "@/lib/utils/currency";

/**
 * DTOs returned by the service layer. Prisma `Decimal` and `Date` values never
 * cross into client components directly — amounts become decimal strings and
 * timestamps become ISO strings so they serialise losslessly.
 */

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AgentDTO = {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AgentWithTotals = AgentDTO & {
  ticketCount: number;
  paidCount: number;
  unpaidCount: number;
  totalAmount: MoneyString;
  paidAmount: MoneyString;
  outstandingAmount: MoneyString;
  currency: string;
};

export type TicketDTO = {
  id: string;
  pnr: string;
  amount: MoneyString;
  currency: string;
  status: TicketStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  agent: { id: string; name: string; code: string };
  createdBy: { id: string; name: string } | null;
  payment: PaymentSummary | null;
  daysOutstanding: number;
};

export type PaymentSummary = {
  id: string;
  transactionNumber: string;
  amount: MoneyString;
  currency: string;
  paidAt: string;
  paidBy: { id: string; name: string } | null;
  notes: string | null;
};

export type PaymentDTO = PaymentSummary & {
  createdAt: string;
  ticket: {
    id: string;
    pnr: string;
    amount: MoneyString;
    currency: string;
    status: TicketStatus;
    createdAt: string;
    agent: { id: string; name: string; code: string };
  };
};

export type DashboardStats = {
  currency: string;
  totalAgents: number;
  activeAgents: number;
  totalTickets: number;
  paidTickets: number;
  unpaidTickets: number;
  totalAmount: MoneyString;
  totalPaid: MoneyString;
  totalOutstanding: MoneyString;
  paymentsThisMonth: number;
  paidThisMonth: MoneyString;
  ticketsThisMonth: number;
  overdueTickets: number;
};

export type MonthlyPoint = {
  month: string;
  label: string;
  billed: MoneyString;
  collected: MoneyString;
};

export type TopAgentPoint = {
  agentId: string;
  name: string;
  code: string;
  outstanding: MoneyString;
};

export type StatementLine = {
  date: string;
  reference: string;
  description: string;
  type: "TICKET" | "PAYMENT";
  debit: MoneyString | null;
  credit: MoneyString | null;
  balance: MoneyString;
  ticketId: string;
  paymentId?: string;
};

export type Statement = {
  agent: AgentDTO;
  currency: string;
  from: string | null;
  to: string | null;
  openingBalance: MoneyString;
  closingBalance: MoneyString;
  summary: {
    ticketCount: number;
    totalAmount: MoneyString;
    totalPaid: MoneyString;
    outstanding: MoneyString;
  };
  lines: StatementLine[];
};

export type AuditLogDTO = {
  id: string;
  action: AuditAction;
  entityType: AuditEntity;
  entityId: string | null;
  summary: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; role: Role } | null;
};

export type UserDTO = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  ticketCount: number;
  paymentCount: number;
};

export type SettingsDTO = {
  agencyName: string;
  defaultCurrency: string;
  timezone: string;
  outstandingWarnDays: number;
  outstandingCriticalDays: number;
  updatedAt: string;
};
