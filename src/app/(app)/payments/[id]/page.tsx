import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuditEntity } from "@prisma/client";
import { ArrowLeft, BadgeCheck, History, Ticket as TicketIcon } from "lucide-react";
import { requirePageUser } from "@/lib/auth/guard";
import { can } from "@/lib/auth/permissions";
import { getPayment } from "@/lib/services/payments";
import { listAuditForEntity } from "@/lib/services/audit";
import { getSettings } from "@/lib/services/settings";
import { AppError } from "@/lib/utils/errors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryList, SummaryRow } from "@/components/shared/summary-row";
import { Money } from "@/components/shared/money";
import { StatusBadge } from "@/components/shared/status-badge";
import { CopyButton } from "@/components/shared/copy-button";
import { ReversePaymentDialog } from "@/components/payments/reverse-payment-dialog";
import { AuditTimeline } from "@/components/activity/audit-timeline";
import { formatDateTime } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const payment = await getPayment(id);
    return { title: `Payment ${payment.transactionNumber}` };
  } catch {
    return { title: "Payment" };
  }
}

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePageUser(`/payments/${id}`);

  let payment;
  try {
    payment = await getPayment(id);
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }

  const [settings, history] = await Promise.all([
    getSettings(),
    listAuditForEntity(AuditEntity.PAYMENT, payment.id, 20),
  ]);

  return (
    <>
      <PageHeader
        title={`Transaction ${payment.transactionNumber}`}
        description={`${payment.ticket.agent.name} · ${payment.ticket.pnr}`}
        breadcrumbs={[
          { label: "Payments", href: "/payments" },
          { label: payment.transactionNumber },
        ]}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href={`/tickets/${payment.ticket.id}`}>
                <ArrowLeft /> Back to ticket
              </Link>
            </Button>
            {can(user.role, "payment:reverse") && (
              <ReversePaymentDialog
                payment={{
                  id: payment.id,
                  transactionNumber: payment.transactionNumber,
                  amount: payment.amount,
                  currency: payment.currency,
                  paidAt: payment.paidAt,
                  ticket: {
                    pnr: payment.ticket.pnr,
                    agent: { name: payment.ticket.agent.name },
                  },
                }}
                timezone={settings.timezone}
                redirectTo="/payments"
              />
            )}
          </>
        }
      />

      <div className="rounded-[var(--radius-card)] border border-paid-200 bg-paid-50 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-paid-100 text-paid-700">
              <BadgeCheck className="size-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-paid-700">
                Payment received
              </p>
              <p className="mt-0.5 text-[13px] text-paid-800">
                Confirmed by transaction{" "}
                <span className="font-mono font-semibold tracking-[0.15em]">
                  {payment.transactionNumber}
                </span>{" "}
                on {formatDateTime(payment.paidAt, settings.timezone)}
              </p>
            </div>
          </div>
          <Money
            amount={payment.amount}
            currency={payment.currency}
            tone="paid"
            size="xl"
          />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Payment record</CardTitle>
            </CardHeader>
            <CardContent className="py-1">
              <SummaryList>
                <SummaryRow label="Transaction number">
                  <span className="inline-flex items-center gap-1 font-mono text-[15px] font-semibold tracking-[0.2em] text-paid-700">
                    {payment.transactionNumber}
                    <CopyButton
                      value={payment.transactionNumber}
                      label="Copy transaction number"
                    />
                  </span>
                </SummaryRow>
                <SummaryRow label="Amount">
                  <Money amount={payment.amount} currency={payment.currency} tone="paid" />
                </SummaryRow>
                <SummaryRow label="Currency">{payment.currency}</SummaryRow>
                <SummaryRow label="Paid at">
                  {formatDateTime(payment.paidAt, settings.timezone)}
                </SummaryRow>
                <SummaryRow label="Recorded by">{payment.paidBy?.name ?? "—"}</SummaryRow>
                <SummaryRow label="Recorded at">
                  {formatDateTime(payment.createdAt, settings.timezone)}
                </SummaryRow>
                {payment.notes && (
                  <SummaryRow label="Notes">
                    <span className="font-normal text-navy-600">{payment.notes}</span>
                  </SummaryRow>
                )}
              </SummaryList>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ticket settled</CardTitle>
              <StatusBadge status={payment.ticket.status} size="sm" />
            </CardHeader>
            <CardContent className="py-1">
              <SummaryList>
                <SummaryRow label="PNR">
                  <Link
                    href={`/tickets/${payment.ticket.id}`}
                    className="font-mono tracking-wide text-brand-600 transition-colors hover:text-brand-700"
                  >
                    {payment.ticket.pnr}
                  </Link>
                </SummaryRow>
                <SummaryRow label="Agent">
                  <Link
                    href={`/agents/${payment.ticket.agent.id}`}
                    className="text-brand-600 transition-colors hover:text-brand-700"
                  >
                    {payment.ticket.agent.name}
                  </Link>
                  <span className="ml-1.5 text-[12px] font-normal text-navy-400">
                    {payment.ticket.agent.code}
                  </span>
                </SummaryRow>
                <SummaryRow label="Ticket amount">
                  <Money
                    amount={payment.ticket.amount}
                    currency={payment.ticket.currency}
                    tone="paid"
                  />
                </SummaryRow>
                <SummaryRow label="Ticket created">
                  {formatDateTime(payment.ticket.createdAt, settings.timezone)}
                </SummaryRow>
              </SummaryList>
              <div className="pb-3 pt-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/tickets/${payment.ticket.id}`}>
                    <TicketIcon /> Open ticket
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Audit history</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/activity?q=${encodeURIComponent(payment.transactionNumber)}`}>
                <History /> Full log
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {history.length > 0 ? (
              <AuditTimeline entries={history} timezone={settings.timezone} />
            ) : (
              <p className="py-4 text-center text-[13px] text-navy-500">
                No activity recorded for this payment yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
