import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuditEntity, TicketStatus } from "@prisma/client";
import { ArrowLeft, BadgeCheck, CircleAlert, Clock, History, Wallet } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { getTicket } from "@/lib/services/tickets";
import { listAuditForEntity } from "@/lib/services/audit";
import { getSettings } from "@/lib/services/settings";
import { AppError } from "@/lib/utils/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryList, SummaryRow } from "@/components/shared/summary-row";
import { Money } from "@/components/shared/money";
import { StatusBadge } from "@/components/shared/status-badge";
import { CopyButton } from "@/components/shared/copy-button";
import { EmptyState } from "@/components/shared/empty-state";
import { RecordPaymentDialog } from "@/components/payments/record-payment-dialog";
import { ReversePaymentDialog } from "@/components/payments/reverse-payment-dialog";
import { AuditTimeline } from "@/components/activity/audit-timeline";
import { formatMoney } from "@/lib/utils/currency";
import { formatDateTime } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const ticket = await getTicket(id);
    return { title: `Ticket ${ticket.pnr}` };
  } catch {
    return { title: "Ticket" };
  }
}

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePageUser(`/tickets/${id}`);

  let ticket;
  try {
    ticket = await getTicket(id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }

  const [settings, auditEntries, paymentAudit] = await Promise.all([
    getSettings(),
    listAuditForEntity(AuditEntity.TICKET, ticket.id, 20),
    ticket.payment
      ? listAuditForEntity(AuditEntity.PAYMENT, ticket.payment.id, 10)
      : Promise.resolve([]),
  ]);

  // Ticket and payment entries interleave into a single history for this ticket.
  const history = [...auditEntries, ...paymentAudit].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const paid = ticket.status === TicketStatus.PAID;
  const overdue =
    !paid && ticket.daysOutstanding >= settings.outstandingCriticalDays;

  return (
    <>
      <PageHeader
        title={ticket.pnr}
        description={`${ticket.agent.name} · ${ticket.agent.code}`}
        breadcrumbs={[
          { label: "Tickets", href: "/tickets" },
          { label: ticket.pnr },
        ]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/agents/${ticket.agent.id}`}>
                <ArrowLeft /> Agent page
              </Link>
            </Button>
            {!paid && can(user.role, "payment:create") && (
              <RecordPaymentDialog ticket={ticket} timezone={settings.timezone} />
            )}
            {paid && ticket.payment && can(user.role, "payment:reverse") && (
              <ReversePaymentDialog
                payment={{
                  id: ticket.payment.id,
                  transactionNumber: ticket.payment.transactionNumber,
                  amount: ticket.payment.amount,
                  currency: ticket.payment.currency,
                  paidAt: ticket.payment.paidAt,
                  ticket: { pnr: ticket.pnr, agent: { name: ticket.agent.name } },
                }}
                timezone={settings.timezone}
                redirectTo={`/tickets/${ticket.id}`}
              />
            )}
          </>
        }
      />

      {/* Status banner — the answer to "is this paid?" before anything else. */}
      <div
        className={cnStatusBanner(paid)}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={
                paid
                  ? "flex size-10 items-center justify-center rounded-full bg-paid-100 text-paid-700"
                  : "flex size-10 items-center justify-center rounded-full bg-unpaid-100 text-unpaid-700"
              }
            >
              {paid ? <BadgeCheck className="size-5" /> : <CircleAlert className="size-5" />}
            </span>
            <div>
              <StatusBadge status={ticket.status} />
              <p
                className={
                  paid
                    ? "mt-1 text-[13px] text-paid-800"
                    : "mt-1 text-[13px] text-unpaid-800"
                }
              >
                {paid && ticket.payment ? (
                  <>
                    Settled with transaction{" "}
                    <span className="font-mono font-semibold">
                      {ticket.payment.transactionNumber}
                    </span>{" "}
                    on {formatDateTime(ticket.payment.paidAt, settings.timezone)}
                  </>
                ) : (
                  <>
                    Outstanding for {ticket.daysOutstanding}{" "}
                    {ticket.daysOutstanding === 1 ? "day" : "days"}
                    {overdue && " — past the agency threshold"}
                  </>
                )}
              </p>
            </div>
          </div>
          <Money
            amount={ticket.amount}
            currency={ticket.currency}
            tone={paid ? "paid" : "unpaid"}
            size="xl"
          />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Ticket details</CardTitle>
              <StatusBadge status={ticket.status} size="sm" />
            </CardHeader>
            <CardContent className="py-1">
              <SummaryList>
                <SummaryRow label="PNR">
                  <span className="inline-flex items-center gap-1 font-mono tracking-wide">
                    {ticket.pnr}
                    <CopyButton value={ticket.pnr} label="Copy PNR" />
                  </span>
                </SummaryRow>
                <SummaryRow label="Agent">
                  <Link
                    href={`/agents/${ticket.agent.id}`}
                    className="text-brand-600 transition-colors hover:text-brand-700"
                  >
                    {ticket.agent.name}
                  </Link>
                  <span className="ml-1.5 text-[12px] font-normal text-navy-400">
                    {ticket.agent.code}
                  </span>
                </SummaryRow>
                <SummaryRow label="Amount">
                  <Money
                    amount={ticket.amount}
                    currency={ticket.currency}
                    tone={paid ? "paid" : "unpaid"}
                  />
                </SummaryRow>
                <SummaryRow label="Currency">{ticket.currency}</SummaryRow>
                <SummaryRow label="Status">
                  <StatusBadge status={ticket.status} size="sm" />
                </SummaryRow>
                <SummaryRow label="Created by">
                  {ticket.createdBy?.name ?? "—"}
                </SummaryRow>
                <SummaryRow label="Created at">
                  {formatDateTime(ticket.createdAt, settings.timezone)}
                </SummaryRow>
                {ticket.notes && (
                  <SummaryRow label="Notes">
                    <span className="font-normal text-navy-600">{ticket.notes}</span>
                  </SummaryRow>
                )}
              </SummaryList>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment information</CardTitle>
              {ticket.payment && (
                <Badge variant="paid" size="sm">
                  Transaction {ticket.payment.transactionNumber}
                </Badge>
              )}
            </CardHeader>

            {ticket.payment ? (
              <CardContent className="py-1">
                <SummaryList>
                  <SummaryRow label="Transaction number">
                    <span className="inline-flex items-center gap-1 font-mono text-[15px] font-semibold tracking-[0.2em] text-paid-700">
                      {ticket.payment.transactionNumber}
                      <CopyButton
                        value={ticket.payment.transactionNumber}
                        label="Copy transaction number"
                      />
                    </span>
                  </SummaryRow>
                  <SummaryRow label="Amount received">
                    <Money
                      amount={ticket.payment.amount}
                      currency={ticket.payment.currency}
                      tone="paid"
                    />
                  </SummaryRow>
                  <SummaryRow label="Paid at">
                    {formatDateTime(ticket.payment.paidAt, settings.timezone)}
                  </SummaryRow>
                  <SummaryRow label="Recorded by">
                    {ticket.payment.paidBy?.name ?? "—"}
                  </SummaryRow>
                  {ticket.payment.notes && (
                    <SummaryRow label="Notes">
                      <span className="font-normal text-navy-600">
                        {ticket.payment.notes}
                      </span>
                    </SummaryRow>
                  )}
                </SummaryList>
                <div className="pb-3 pt-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/payments/${ticket.payment.id}`}>
                      <Wallet /> Open payment record
                    </Link>
                  </Button>
                </div>
              </CardContent>
            ) : (
              <EmptyState
                icon={Clock}
                compact
                title="No payment recorded"
                description={`${ticket.agent.name} owes ${formatMoney(ticket.amount, ticket.currency)} on this ticket. Record the payment once A TO Z receives the transfer notification.`}
                action={
                  can(user.role, "payment:create") ? (
                    <RecordPaymentDialog ticket={ticket} timezone={settings.timezone} />
                  ) : undefined
                }
              />
            )}
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Audit history</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/activity?q=${encodeURIComponent(ticket.pnr)}`}>
                <History /> Full log
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {history.length > 0 ? (
              <AuditTimeline entries={history} timezone={settings.timezone} />
            ) : (
              <p className="py-4 text-center text-[13px] text-navy-500">
                No activity recorded for this ticket yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

/** Status banner colours, kept out of the JSX for readability. */
function cnStatusBanner(paid: boolean) {
  return paid
    ? "rounded-[var(--radius-card)] border border-paid-200 bg-paid-50 px-5 py-4"
    : "rounded-[var(--radius-card)] border border-unpaid-200 bg-unpaid-50 px-5 py-4";
}
