"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Undo2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { SummaryList, SummaryRow } from "@/components/shared/summary-row";
import { Money } from "@/components/shared/money";
import { useToast } from "@/components/ui/toast";
import { apiRequest } from "@/lib/utils/api-client";
import { zodFieldErrors } from "@/lib/utils/errors";
import { paymentReverseSchema } from "@/lib/validation/schemas";
import { formatDateTime } from "@/lib/utils/dates";

/**
 * Reverse Payment — administrators only.
 *
 * A payment is never silently undone: this is a dedicated workflow that
 * requires a written reason and an explicit confirmation, and the reversal
 * (including a full snapshot of the deleted payment) is written to the audit
 * log before the ticket returns to unpaid.
 */
export function ReversePaymentDialog({
  payment,
  timezone,
  redirectTo,
}: {
  payment: {
    id: string;
    transactionNumber: string;
    amount: string;
    currency: string;
    paidAt: string;
    ticket: { pnr: string; agent: { name: string } };
  };
  timezone: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const toast = useToast();

  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});

  const onOpenChange = (next: boolean) => {
    if (submitting) return;
    setOpen(next);
    if (!next) {
      setReason("");
      setErrors({});
      setFormError(null);
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);
    setErrors({});

    const parsed = paymentReverseSchema.safeParse({ reason, confirm: true });
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    const result = await apiRequest<{ ticketId: string }>(
      `/api/payments/${payment.id}/reverse`,
      { method: "POST", body: JSON.stringify(parsed.data) },
    );
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.message);
      setErrors(result.fieldErrors ?? {});
      return;
    }

    toast.success(
      `Payment ${payment.transactionNumber} reversed`,
      `${payment.ticket.pnr} is unpaid again. The reversal is recorded in the activity log.`,
    );
    setOpen(false);
    router.push(redirectTo ?? `/tickets/${result.data.ticketId}`);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="dangerOutline">
          <Undo2 /> Reverse Payment
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reverse payment</DialogTitle>
          <DialogDescription>
            This returns the ticket to unpaid and removes the payment record.
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

            <Alert tone="danger" title="This affects financial records">
              The agent&rsquo;s outstanding balance will increase by this amount
              and transaction number {payment.transactionNumber} becomes
              available again. A full snapshot of the payment is kept in the
              activity log.
            </Alert>

            <div className="rounded-lg border border-hairline bg-navy-50/60 px-4 py-1">
              <SummaryList>
                <SummaryRow label="Agent">{payment.ticket.agent.name}</SummaryRow>
                <SummaryRow label="PNR" mono>{payment.ticket.pnr}</SummaryRow>
                <SummaryRow label="Transaction number" mono>
                  {payment.transactionNumber}
                </SummaryRow>
                <SummaryRow label="Amount">
                  <Money amount={payment.amount} currency={payment.currency} tone="paid" />
                </SummaryRow>
                <SummaryRow label="Recorded">
                  {formatDateTime(payment.paidAt, timezone)}
                </SummaryRow>
              </SummaryList>
            </div>

            <Field
              label="Reason for reversal"
              htmlFor="reverse-reason"
              required
              error={errors.reason}
              hint="At least 10 characters. This is stored permanently in the activity log."
            >
              <Textarea
                id="reverse-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                placeholder="e.g. Transaction number entered against the wrong ticket."
                invalid={Boolean(errors.reason)}
                autoFocus
              />
            </Field>
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
            <Button
              type="submit"
              variant="danger"
              loading={submitting}
              disabled={reason.trim().length < 10}
            >
              {submitting ? "Reversing…" : "Reverse payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
