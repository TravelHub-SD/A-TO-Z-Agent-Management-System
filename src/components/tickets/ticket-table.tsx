import Link from "next/link";
import { TicketStatus } from "@prisma/client";
import { Ticket as TicketIcon } from "lucide-react";
import type { TicketDTO } from "@/lib/services/types";
import { Table, TBody, TD, TH, THead, TR, TableWrap } from "@/components/ui/table";
import { Money } from "@/components/shared/money";
import { AgeBadge, StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

export type TicketColumn =
  | "pnr"
  | "agent"
  | "amount"
  | "status"
  | "transactionNumber"
  | "createdAt"
  | "paidAt"
  | "daysOutstanding";

const DEFAULT_COLUMNS: TicketColumn[] = [
  "pnr",
  "agent",
  "amount",
  "status",
  "transactionNumber",
  "createdAt",
  "paidAt",
];

const HEADERS: Record<TicketColumn, string> = {
  pnr: "PNR",
  agent: "Agent",
  amount: "Amount",
  status: "Status",
  transactionNumber: "Transaction No.",
  createdAt: "Created",
  paidAt: "Paid",
  daysOutstanding: "Days outstanding",
};

/**
 * The ticket table used on the dashboard, the ticket pages and agent details.
 * Amount and status share one colour language: red while owed, green once
 * settled.
 */
export function TicketTable({
  tickets,
  timezone,
  columns = DEFAULT_COLUMNS,
  warnDays = 14,
  criticalDays = 30,
  empty,
  actions,
}: {
  tickets: TicketDTO[];
  timezone: string;
  columns?: TicketColumn[];
  warnDays?: number;
  criticalDays?: number;
  empty?: React.ReactNode;
  actions?: (ticket: TicketDTO) => React.ReactNode;
}) {
  if (tickets.length === 0) {
    return (
      <>
        {empty ?? (
          <EmptyState
            icon={TicketIcon}
            title="No tickets found"
            description="No tickets match the current filters."
          />
        )}
      </>
    );
  }

  const alignRight = (column: TicketColumn) =>
    column === "amount" || column === "daysOutstanding";

  return (
    <TableWrap>
      <Table>
        <THead>
          <TR className="hover:bg-transparent">
            {columns.map((column) => (
              <TH key={column} align={alignRight(column) ? "right" : "left"}>
                {HEADERS[column]}
              </TH>
            ))}
            {actions && <TH align="right">Actions</TH>}
          </TR>
        </THead>
        <TBody>
          {tickets.map((ticket) => {
            const paid = ticket.status === TicketStatus.PAID;
            return (
              <TR key={ticket.id}>
                {columns.map((column) => {
                  switch (column) {
                    case "pnr":
                      return (
                        <TD key={column}>
                          <Link
                            href={`/tickets/${ticket.id}`}
                            className="font-mono text-[13px] font-semibold tracking-tight text-navy-900 transition-colors hover:text-brand-600"
                          >
                            {ticket.pnr}
                          </Link>
                        </TD>
                      );
                    case "agent":
                      return (
                        <TD key={column}>
                          <Link
                            href={`/agents/${ticket.agent.id}`}
                            className="transition-colors hover:text-brand-600"
                          >
                            <span className="block max-w-[12rem] truncate font-medium">
                              {ticket.agent.name}
                            </span>
                            <span className="block text-[11.5px] text-navy-400">
                              {ticket.agent.code}
                            </span>
                          </Link>
                        </TD>
                      );
                    case "amount":
                      return (
                        <TD key={column} align="right">
                          <Money
                            amount={ticket.amount}
                            currency={ticket.currency}
                            tone={paid ? "paid" : "unpaid"}
                          />
                        </TD>
                      );
                    case "status":
                      return (
                        <TD key={column}>
                          <StatusBadge status={ticket.status} />
                        </TD>
                      );
                    case "transactionNumber":
                      return (
                        <TD key={column}>
                          <span
                            className={cn(
                              "font-mono text-[13px] tabular",
                              ticket.payment
                                ? "font-semibold text-paid-700"
                                : "text-navy-300",
                            )}
                          >
                            {ticket.payment?.transactionNumber ?? "—"}
                          </span>
                        </TD>
                      );
                    case "createdAt":
                      return (
                        <TD key={column} className="whitespace-nowrap text-navy-600">
                          {formatDate(ticket.createdAt, timezone)}
                        </TD>
                      );
                    case "paidAt":
                      return (
                        <TD key={column} className="whitespace-nowrap text-navy-600">
                          {ticket.payment
                            ? formatDate(ticket.payment.paidAt, timezone)
                            : <span className="text-navy-300">—</span>}
                        </TD>
                      );
                    case "daysOutstanding":
                      return (
                        <TD key={column} align="right">
                          <AgeBadge
                            days={ticket.daysOutstanding}
                            warnDays={warnDays}
                            criticalDays={criticalDays}
                          />
                        </TD>
                      );
                    default:
                      return null;
                  }
                })}
                {actions && (
                  <TD align="right" className="whitespace-nowrap">
                    {actions(ticket)}
                  </TD>
                )}
              </TR>
            );
          })}
        </TBody>
      </Table>
    </TableWrap>
  );
}
