"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ticketCreateSchema } from "@/lib/validation/schemas";
import { apiRequest } from "@/lib/utils/api-client";
import { zodFieldErrors } from "@/lib/utils/errors";
import { formatMoney } from "@/lib/utils/currency";
import { SUPPORTED_CURRENCIES } from "@/lib/constants";
import type { TicketDTO } from "@/lib/services/types";

export type AgentOption = { id: string; name: string; code: string };

/**
 * Add Ticket. Opened from the tickets page, the dashboard or an agent's page —
 * when it comes from an agent page that agent is preselected and locked, which
 * removes the most likely data-entry mistake.
 */
export function TicketFormDialog({
  agents,
  defaultAgentId,
  lockAgent = false,
  defaultCurrency,
  trigger,
  onCreated,
}: {
  agents: AgentOption[];
  defaultAgentId?: string;
  lockAgent?: boolean;
  defaultCurrency: string;
  trigger?: React.ReactNode;
  onCreated?: (ticket: TicketDTO) => void;
}) {
  const router = useRouter();
  const toast = useToast();

  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});

  const [agentId, setAgentId] = React.useState(defaultAgentId ?? "");
  const [pnr, setPnr] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [currency, setCurrency] = React.useState(defaultCurrency);
  const [notes, setNotes] = React.useState("");

  const reset = React.useCallback(() => {
    setAgentId(defaultAgentId ?? "");
    setPnr("");
    setAmount("");
    setCurrency(defaultCurrency);
    setNotes("");
    setErrors({});
    setFormError(null);
  }, [defaultAgentId, defaultCurrency]);

  const onOpenChange = (next: boolean) => {
    if (submitting) return;
    setOpen(next);
    if (!next) reset();
  };

  const numericAmount = Number(amount.replace(/[\s,]/g, ""));
  const previewAmount =
    amount.trim() !== "" && Number.isFinite(numericAmount) && numericAmount > 0
      ? formatMoney(numericAmount, currency)
      : null;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setFormError(null);
    setErrors({});

    const parsed = ticketCreateSchema.safeParse({
      agentId,
      pnr,
      amount,
      currency,
      notes,
    });
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    const result = await apiRequest<{ ticket: TicketDTO }>("/api/tickets", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    setSubmitting(false);

    if (!result.ok) {
      setFormError(result.message);
      setErrors(result.fieldErrors ?? {});
      return;
    }

    const ticket = result.data.ticket;
    toast.success(
      `Ticket ${ticket.pnr} created`,
      `${formatMoney(ticket.amount, ticket.currency)} outstanding for ${ticket.agent.name}.`,
    );
    setOpen(false);
    reset();
    onCreated?.(ticket);
    router.refresh();
  };

  const selectedAgent = agents.find((agent) => agent.id === agentId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="brand">
            <Plus /> Add Ticket
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add ticket</DialogTitle>
          <DialogDescription>
            New tickets are created as unpaid. Record the payment separately
            once the agent has settled it.
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

            <Field label="Agent" htmlFor="ticket-agent" required error={errors.agentId}>
              {lockAgent && selectedAgent ? (
                <div className="flex h-9 items-center rounded-lg border border-navy-200 bg-navy-50 px-3 text-sm text-navy-700">
                  {selectedAgent.name}
                  <span className="ml-2 text-[12px] text-navy-400">
                    {selectedAgent.code}
                  </span>
                </div>
              ) : (
                <Select value={agentId} onValueChange={setAgentId}>
                  <SelectTrigger id="ticket-agent" invalid={Boolean(errors.agentId)}>
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name} · {agent.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>

            <Field
              label="PNR"
              htmlFor="ticket-pnr"
              required
              error={errors.pnr}
              hint="5–8 letters or digits, for example ABC123."
            >
              <Input
                id="ticket-pnr"
                value={pnr}
                onChange={(event) => setPnr(event.target.value.toUpperCase())}
                placeholder="ABC123"
                autoComplete="off"
                spellCheck={false}
                maxLength={8}
                invalid={Boolean(errors.pnr)}
                className="font-mono tracking-wide"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
              <Field
                label="Amount"
                htmlFor="ticket-amount"
                required
                error={errors.amount}
                hint={previewAmount ? `Will be recorded as ${previewAmount}` : undefined}
              >
                <Input
                  id="ticket-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="1,250,000"
                  autoComplete="off"
                  invalid={Boolean(errors.amount)}
                  className="tabular"
                />
              </Field>

              <Field label="Currency" htmlFor="ticket-currency" error={errors.currency}>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="ticket-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((item) => (
                      <SelectItem key={item.code} value={item.code}>
                        {item.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Notes" htmlFor="ticket-notes" error={errors.notes}>
              <Textarea
                id="ticket-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional — route, passenger reference, internal remarks."
                rows={2}
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
            <Button type="submit" variant="brand" loading={submitting}>
              {submitting ? "Creating…" : "Create ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
