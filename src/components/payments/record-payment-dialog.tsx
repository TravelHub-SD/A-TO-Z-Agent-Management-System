"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, BadgeCheck, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SummaryList, SummaryRow } from "@/components/shared/summary-row";
import { Money } from "@/components/shared/money";
import { useToast } from "@/components/ui/toast";
import { apiRequest } from "@/lib/utils/api-client";
import { zodFieldErrors } from "@/lib/utils/errors";
import { paymentCreateSchema } from "@/lib/validation/schemas";
import { formatMoney } from "@/lib/utils/currency";
import { formatDateTime, toISODate } from "@/lib/utils/dates";
import { TRANSACTION_NUMBER_PATTERN } from "@/lib/constants";
import type { PaymentDTO, TicketDTO } from "@/lib/services/types";

/**
 * Record Payment.
 *
 * Marking a ticket paid is a financial act, so it is never a toggle. The
 * dialog restates the agent, PNR and exact amount, requires the 4-digit
 * transaction number, and only then commits.
 */
export function RecordPaymentDialog({
  ticket,
  timezone,
  trigger,
  onRecorded,
}: {
  ticket: Pick<TicketDTO, "id" | "pnr" | "amount" | "currency" | "agent" | "createdAt">;
  timezone: string;
  trigger?: React.ReactNode;
  onRecorded?: (payment: PaymentDTO) => void;
}) {
  const router = useRouter();
  const toast = useToast();

  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});

  const [transactionNumber, setTransactionNumber] = React.useState("");
  const [paidAt, setPaidAt] = React.useState(() => toISODate(new Date(), timezone));
  const [notes, setNotes] = React.useState("");

  const inputRef = React.useRef<HTMLInputElement>(null);

  const reset = React.useCallback(() => {
    setTransactionNumber("");
    setPaidAt(toISODate(new Date(), timezone));
    setNotes("");
    setErrors({});
    setFormError(null);
  }, [timezone]);

  const onOpenChange = (next: boolean) => {
    if (submitting) return;
    setOpen(next);
    if (!next) reset();
    else window.setTimeout(() => inputRef.current?.focus(), 60);
  };

  const valid = TRANSACTION_NUMBER_PATTERN.test(transactionNumber);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);
    setErrors({});

    const parsed = paymentCreateSchema.safeParse({ transactionNumber, paidAt, notes });
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    const result = await apiRequest<{ payment: PaymentDTO }>(
      `/api/tickets/${ticket.id}/payment`,
      {
        method: "POST",
        body: JSON.stringify({
          transactionNumber: parsed.data.transactionNumber,
          paidAt: parsed.data.paidAt?.toISOString(),
          notes: parsed.data.notes,
        }),
      },
    );
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.message);
      setErrors(result.fieldErrors ?? {});
      return;
    }

    toast.success(
      `${ticket.pnr} marked as paid`,
      `${formatMoney(ticket.amount, ticket.currency)} received — transaction ${parsed.data.transactionNumber}.`,
    );
    setOpen(false);
    reset();
    onRecorded?.(result.data.payment);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="success">
            <BadgeCheck /> Record Payment
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Check these details against the payment notification, then enter the
            transaction number to confirm.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate>
          <DialogBody className="space-y-4">
            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-unpaid-200 bg-unpaid-50 p-3 text-[13px] text-unpaid-800"
              >
                <AlertCircle className="mt-px size-4 shrink-0 text-unpaid-600" />
                <span>{formError}</span>
              </div>
            )}

            {/* What is being confirmed — restated before any input. */}
            <div className="rounded-lg border border-hairline bg-navy-50/60 px-4 py-1">
              <SummaryList>
                <SummaryRow label="Agent">
                  {ticket.agent.name}
                  <span className="ml-1.5 text-[12px] font-normal text-navy-400">
                    {ticket.agent.code}
                  </span>
                </SummaryRow>
                <SummaryRow label="PNR" mono>
                  {ticket.pnr}
                </SummaryRow>
                <SummaryRow label="Amount">
                  <Money amount={ticket.amount} currency={ticket.currency} tone="unpaid" size="lg" />
                </SummaryRow>
                <SummaryRow label="Ticket created">
                  {formatDateTime(ticket.createdAt, timezone)}
                </SummaryRow>
              </SummaryList>
            </div>

            <Field
              label="Transaction number"
              htmlFor="payment-txn"
              required
              error={errors.transactionNumber}
              hint="Exactly 4 digits, as shown on the payment confirmation (e.g. 4827)."
            >
              <Input
                id="payment-txn"
                ref={inputRef}
                value={transactionNumber}
                onChange={(event) =>
                  setTransactionNumber(event.target.value.replace(/\D/g, "").slice(0, 4))
                }
                inputMode="numeric"
                autoComplete="off"
                placeholder="4827"
                maxLength={4}
                invalid={Boolean(errors.transactionNumber)}
                className="tabular w-32 text-center font-mono text-lg font-semibold tracking-[0.35em]"
              />
            </Field>

            <Field label="Payment date" htmlFor="payment-date" error={errors.paidAt}>
              <Input
                id="payment-date"
                type="date"
                value={paidAt}
                max={toISODate(new Date(), timezone)}
                onChange={(event) => setPaidAt(event.target.value)}
                className="w-48"
              />
            </Field>

            <Field label="Notes" htmlFor="payment-notes" error={errors.notes}>
              <Textarea
                id="payment-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                placeholder="Optional — bank reference, who confirmed receipt."
              />
            </Field>

            <p className="flex items-start gap-2 text-[12px] leading-relaxed text-navy-500">
              <ShieldCheck className="mt-px size-3.5 shrink-0 text-navy-400" aria-hidden />
              Confirming records the payment in full, marks the ticket as paid
              and writes an entry to the activity log. The payment amount always
              equals the ticket amount.
            </p>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="success" loading={submitting} disabled={!valid}>
              {submitting
                ? "Recording…"
                : `Confirm ${formatMoney(ticket.amount, ticket.currency)}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
